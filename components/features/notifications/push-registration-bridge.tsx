"use client";

import { useEffect, useRef } from "react";

import { ensureBrowserPushSubscription, serializePushSubscription } from "@/lib/pushRegistration";
import { notificationService } from "@/lib/notificationService";
import { useAuthStore } from "@/store";

export function PushRegistrationBridge() {
  const { status, user } = useAuthStore();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || typeof Notification === "undefined") {
      syncedUserIdRef.current = null;
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    if (syncedUserIdRef.current === user.id) {
      return;
    }

    const vapidPublicKey = notificationService.getVapidPublicKey();

    if (!vapidPublicKey) {
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const subscription = await ensureBrowserPushSubscription(vapidPublicKey);

        if (!subscription || !isMounted) {
          return;
        }

        await notificationService.savePushSubscription(serializePushSubscription(subscription));
        syncedUserIdRef.current = user.id;
      } catch {
        // Push registration should stay silent outside the explicit settings UI.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [status, user]);

  return null;
}
