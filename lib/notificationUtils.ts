import type { NotificationData } from "@/types";

export function buildNotificationHref(data: NotificationData) {
  const route = typeof data.route === "string" ? data.route.trim() : "";

  if (!route.startsWith("/")) {
    return "/notifications";
  }

  return route.replace(/\[([^\]]+)\]/g, (_, token: string) => {
    const directMatch = data[token];
    const idMatch = data[`${token}Id`];
    const fallbackId =
      token === "id"
        ? data.bookingId ?? data.listingId ?? data.campaignId ?? data.conversationId
        : undefined;

    if (typeof directMatch === "string" && directMatch) {
      return directMatch;
    }

    if (typeof idMatch === "string" && idMatch) {
      return idMatch;
    }

    if (typeof fallbackId === "string" && fallbackId) {
      return fallbackId;
    }

    return token;
  });
}

export function formatNotificationTimestamp(value: string) {
  const targetTime = new Date(value).getTime();

  if (!Number.isFinite(targetTime)) {
    return value;
  }

  const deltaMs = Date.now() - targetTime;
  const deltaMinutes = Math.max(1, Math.round(deltaMs / (1000 * 60)));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);

  if (deltaDays < 7) {
    return `${deltaDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(targetTime));
}

export function isBrowserPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalizedBase64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalizedBase64);

  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}
