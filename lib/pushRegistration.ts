import { isBrowserPushSupported, urlBase64ToUint8Array } from "@/lib/notificationUtils";
import type { PushSubscriptionKeys } from "@/types";

const PUSH_WORKER_PATH = "/push-worker.js";

export type SerializedPushSubscription = {
  endpoint: string;
  keys: PushSubscriptionKeys;
};

export async function ensureBrowserPushSubscription(vapidPublicKey: string) {
  if (!isBrowserPushSupported() || !vapidPublicKey.trim()) {
    return null;
  }

  const registration = await navigator.serviceWorker.register(PUSH_WORKER_PATH, {
    scope: "/"
  });
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });
}

export async function getExistingBrowserPushSubscription() {
  if (!isBrowserPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

export async function removeBrowserPushSubscription() {
  const existingSubscription = await getExistingBrowserPushSubscription();

  if (!existingSubscription) {
    return false;
  }

  return existingSubscription.unsubscribe();
}

export function serializePushSubscription(subscription: PushSubscription): SerializedPushSubscription {
  const payload = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: payload.keys?.auth ?? "",
      p256dh: payload.keys?.p256dh ?? ""
    }
  };
}
