import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { NOTIFICATION_PAGE_SIZE } from "@/config/notifications";
import { getVapidPublicKey } from "@/config/env";
import { AuthService } from "@/services/auth/auth.service";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import {
  ServiceErrorCode,
  type NotificationPreferenceRecord,
  type PushSubscriptionKeys,
  type PushSubscriptionRecord,
  type UpsertNotificationPreferencesInput,
  type UserNotification
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];
type UserPreferenceRow = Database["public"]["Tables"]["user_preferences"]["Row"];

export class NotificationService {
  private readonly authService: AuthService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
  }

  async getMyNotifications(limit = NOTIFICATION_PAGE_SIZE): Promise<UserNotification[]> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .eq("user_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load notifications.", error);
    }

    return (data ?? []).map((row) => this.mapNotification(row));
  }

  async getUnreadNotificationCount(): Promise<number> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const { count, error } = await client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.id)
      .eq("read", false);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the unread notification count.", error);
    }

    return count ?? 0;
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    const client = this.clientFactory();
    const { data, error } = await client.rpc("mark_notification_read", {
      p_notification_id: notificationId
    });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark the notification as read.", error);
    }

    return Boolean(data);
  }

  async markAllNotificationsRead(): Promise<number> {
    const client = this.clientFactory();
    const { data, error } = await client.rpc("mark_all_notifications_read");

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark all notifications as read.", error);
    }

    return typeof data === "number" ? data : 0;
  }

  async getMyPreferences(): Promise<NotificationPreferenceRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const { data, error } = await client.from("user_preferences").select("*").eq("user_id", actor.id).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load notification preferences.", error);
    }

    if (data) {
      return this.mapPreferences(data);
    }

    const nowIso = new Date().toISOString();

    return {
      userId: actor.id,
      countyId: actor.countyId,
      townId: actor.townId,
      areaId: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  async upsertMyPreferences(input: UpsertNotificationPreferencesInput): Promise<NotificationPreferenceRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const countyId = this.normalizeLocationId(input.countyId);
    const townId = this.normalizeLocationId(input.townId);
    const areaId = this.normalizeLocationId(input.areaId);

    if (areaId && !townId) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Select a town before choosing an area.");
    }

    if (townId && !countyId) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Select a county before choosing a town.");
    }

    const { data, error } = await client
      .from("user_preferences")
      .upsert(
        {
          user_id: actor.id,
          county: countyId,
          town: townId,
          area: areaId
        },
        {
          onConflict: "user_id"
        }
      )
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to save notification preferences.", error);
    }

    return this.mapPreferences(data);
  }

  async savePushSubscription(input: { endpoint: string; keys: PushSubscriptionKeys }): Promise<PushSubscriptionRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const endpoint = input.endpoint.trim();

    if (!endpoint) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "A push subscription endpoint is required.");
    }

    if (!input.keys.auth?.trim() || !input.keys.p256dh?.trim()) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "The browser push keys are incomplete.");
    }

    const { data, error } = await client
      .from("push_subscriptions")
      .upsert(
        {
          user_id: actor.id,
          endpoint,
          keys: {
            auth: input.keys.auth.trim(),
            p256dh: input.keys.p256dh.trim()
          }
        },
        {
          onConflict: "endpoint"
        }
      )
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to save the push subscription.", error);
    }

    return this.mapPushSubscription(data);
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const { error } = await client
      .from("push_subscriptions")
      .delete()
      .eq("user_id", actor.id)
      .eq("endpoint", endpoint.trim());

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to remove the push subscription.", error);
    }
  }

  subscribeToNotificationFeed(userId: string, onChange: () => void) {
    const client = this.clientFactory();
    const channel: RealtimeChannel = client
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`
        },
        () => {
          onChange();
        }
      );

    void channel.subscribe();

    return {
      unsubscribe: async () => {
        await client.removeChannel(channel);
      }
    };
  }

  getVapidPublicKey() {
    return getVapidPublicKey();
  }

  private mapNotification(row: NotificationRow): UserNotification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: (row.data ?? {}) as UserNotification["data"],
      read: row.read,
      readAt: row.read_at,
      createdAt: row.created_at
    };
  }

  private mapPushSubscription(row: PushSubscriptionRow): PushSubscriptionRecord {
    return {
      id: row.id,
      userId: row.user_id,
      endpoint: row.endpoint,
      keys: row.keys as PushSubscriptionKeys,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSuccessAt: row.last_success_at,
      lastError: row.last_error
    };
  }

  private mapPreferences(row: UserPreferenceRow): NotificationPreferenceRecord {
    return {
      userId: row.user_id,
      countyId: row.county,
      townId: row.town,
      areaId: row.area,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private normalizeLocationId(value: number | null | undefined) {
    if (typeof value !== "number") {
      return null;
    }

    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
  }
}
