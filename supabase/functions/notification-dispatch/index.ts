import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import webpush from "npm:web-push@3.6.7";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Json;
  push_state: string;
  created_at: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    auth?: string;
    p256dh?: string;
  };
};

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const vapidPublicKey = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:notifications@pata-keja.example";

if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
  throw new Error(
    "Missing notification edge function environment. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT."
  );
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function buildNotificationUrl(data: Json) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "/notifications";
  }

  const route = typeof data.route === "string" ? data.route : "";
  return route.startsWith("/") ? route : "/notifications";
}

async function runHourlyMaintenance() {
  const { data, error } = await supabase.rpc("notification_hourly_maintenance");

  if (error) {
    throw error;
  }

  return data;
}

async function fetchPendingNotifications(batchSize: number) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, body, data, push_state, created_at")
    .eq("push_state", "pending")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    throw error;
  }

  return (data ?? []) as NotificationRow[];
}

async function fetchSubscriptions(userIds: string[]) {
  if (userIds.length === 0) {
    return [] as PushSubscriptionRow[];
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, keys")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as PushSubscriptionRow[];
}

async function markNotificationState(notificationId: string, pushState: "sent" | "failed" | "skipped") {
  const { error } = await supabase
    .from("notifications")
    .update({
      push_state: pushState,
      last_push_attempt_at: new Date().toISOString()
    })
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
}

async function logDeliveryAttempt(input: {
  notificationId: string;
  subscriptionId: string | null;
  endpoint: string;
  status: "sent" | "failed" | "skipped";
  responseStatus?: number | null;
  responseBody?: string | null;
}) {
  const { error } = await supabase.from("notification_push_deliveries").insert({
    notification_id: input.notificationId,
    subscription_id: input.subscriptionId,
    endpoint: input.endpoint,
    status: input.status,
    response_status: input.responseStatus ?? null,
    response_body: input.responseBody ?? null
  });

  if (error) {
    throw error;
  }
}

async function removeDeadSubscription(subscriptionId: string) {
  await supabase.from("push_subscriptions").delete().eq("id", subscriptionId);
}

async function dispatchNotification(notification: NotificationRow, subscriptions: PushSubscriptionRow[]) {
  if (subscriptions.length === 0) {
    await logDeliveryAttempt({
      notificationId: notification.id,
      subscriptionId: null,
      endpoint: "in-app-only",
      status: "skipped",
      responseBody: "No push subscriptions found for user."
    });
    await markNotificationState(notification.id, "skipped");
    return {
      sent: 0,
      failed: 0,
      skipped: 1
    };
  }

  let successfulDeliveries = 0;
  let failedDeliveries = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.keys?.auth ?? "",
            p256dh: subscription.keys?.p256dh ?? ""
          }
        },
        JSON.stringify({
          notificationId: notification.id,
          title: notification.title,
          body: notification.body,
          url: buildNotificationUrl(notification.data),
          data: notification.data
        })
      );

      successfulDeliveries += 1;

      await logDeliveryAttempt({
        notificationId: notification.id,
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        status: "sent",
        responseStatus: 201
      });
    } catch (error) {
      failedDeliveries += 1;

      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : null;
      const body =
        typeof error === "object" && error !== null && "body" in error ? String(error.body ?? "") : String(error);

      await logDeliveryAttempt({
        notificationId: notification.id,
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        status: "failed",
        responseStatus: statusCode,
        responseBody: body
      });

      if (statusCode === 404 || statusCode === 410) {
        await removeDeadSubscription(subscription.id);
      }
    }
  }

  await markNotificationState(notification.id, successfulDeliveries > 0 ? "sent" : "failed");

  return {
    sent: successfulDeliveries,
    failed: failedDeliveries,
    skipped: 0
  };
}

async function dispatchPendingNotifications(batchSize: number) {
  const notifications = await fetchPendingNotifications(batchSize);
  const userIds = [...new Set(notifications.map((notification) => notification.user_id))];
  const subscriptions = await fetchSubscriptions(userIds);
  const subscriptionMap = subscriptions.reduce<Record<string, PushSubscriptionRow[]>>((accumulator, subscription) => {
    if (!accumulator[subscription.user_id]) {
      accumulator[subscription.user_id] = [];
    }

    accumulator[subscription.user_id].push(subscription);
    return accumulator;
  }, {});
  const summary = {
    notificationsProcessed: notifications.length,
    sent: 0,
    failed: 0,
    skipped: 0
  };

  for (const notification of notifications) {
    const result = await dispatchNotification(notification, subscriptionMap[notification.user_id] ?? []);
    summary.sent += result.sent;
    summary.failed += result.failed;
    summary.skipped += result.skipped;
  }

  return summary;
}

Deno.serve(async (request) => {
  try {
    if (!["GET", "POST"].includes(request.method)) {
      return jsonResponse({ message: "Method not allowed." }, 405);
    }

    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const batchSize = typeof body?.batchSize === "number" && body.batchSize > 0 ? Math.trunc(body.batchSize) : 50;
    const maintenance = await runHourlyMaintenance();
    const dispatchSummary = await dispatchPendingNotifications(batchSize);

    return jsonResponse({
      maintenance,
      dispatchSummary
    });
  } catch (error) {
    return jsonResponse(
      {
        message: error instanceof Error ? error.message : "Unable to dispatch notifications."
      },
      500
    );
  }
});
