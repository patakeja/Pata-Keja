"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { locationService } from "@/lib/locationService";
import { buildNotificationHref, formatNotificationTimestamp } from "@/lib/notificationUtils";
import { notificationService } from "@/lib/notificationService";
import {
  ensureBrowserPushSubscription,
  getExistingBrowserPushSubscription,
  removeBrowserPushSubscription,
  serializePushSubscription
} from "@/lib/pushRegistration";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import {
  NotificationType,
  UserRole,
  type ListingLocationCatalog,
  type NotificationPreferenceRecord,
  type UserNotification
} from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const selectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading notifications.";
}

function getNotificationBadge(type: NotificationType) {
  if (type === NotificationType.MESSAGE) {
    return "Message";
  }

  if (type === NotificationType.BOOKING) {
    return "Booking";
  }

  if (type === NotificationType.PAYMENT) {
    return "Payment";
  }

  return "System";
}

export function NotificationCenterPanel() {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const canManagePushTargeting = user?.role === UserRole.ADMIN || user?.role === UserRole.LANDLORD;
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferenceRecord | null>(null);
  const [catalog, setCatalog] = useState<ListingLocationCatalog>({
    counties: [],
    towns: [],
    areas: []
  });
  const [countyId, setCountyId] = useState("");
  const [townId, setTownId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const availableTowns = useMemo(() => {
    const parsedCountyId = Number.parseInt(countyId, 10);

    if (!Number.isFinite(parsedCountyId)) {
      return [];
    }

    return catalog.towns.filter((town) => town.countyId === parsedCountyId);
  }, [catalog.towns, countyId]);

  const availableAreas = useMemo(() => {
    const parsedTownId = Number.parseInt(townId, 10);

    if (!Number.isFinite(parsedTownId)) {
      return [];
    }

    return catalog.areas.filter((area) => area.townId === parsedTownId);
  }, [catalog.areas, townId]);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPushPermission("unsupported");
      return;
    }

    setPushPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return undefined;
    }

    let isMounted = true;

    const loadEverything = async () => {
      setIsLoading(true);

      try {
        const nextNotificationsPromise = notificationService.getMyNotifications();
        const nextPreferencesPromise = canManagePushTargeting ? notificationService.getMyPreferences() : Promise.resolve(null);
        const nextCatalogPromise = canManagePushTargeting
          ? locationService.getLocationCatalog()
          : Promise.resolve<ListingLocationCatalog>({
              counties: [],
              towns: [],
              areas: []
            });
        const existingSubscriptionPromise = canManagePushTargeting
          ? getExistingBrowserPushSubscription()
          : Promise.resolve(null);
        const [nextNotifications, nextPreferences, nextCatalog, existingSubscription] = await Promise.all([
          nextNotificationsPromise,
          nextPreferencesPromise,
          nextCatalogPromise,
          existingSubscriptionPromise
        ]);

        if (!isMounted) {
          return;
        }

        setNotifications(nextNotifications);
        setPreferences(nextPreferences);
        setCountyId(nextPreferences?.countyId ? String(nextPreferences.countyId) : "");
        setTownId(nextPreferences?.townId ? String(nextPreferences.townId) : "");
        setAreaId(nextPreferences?.areaId ? String(nextPreferences.areaId) : "");
        setCatalog(nextCatalog);
        setIsPushEnabled(Boolean(existingSubscription));
        setFeedback(null);
      } catch (error) {
        if (isMounted) {
          setFeedback({ tone: "error", message: getErrorMessage(error) });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadEverything();

    const subscription = notificationService.subscribeToNotificationFeed(user.id, () => {
      void notificationService
        .getMyNotifications()
        .then((nextNotifications) => setNotifications(nextNotifications))
        .catch(() => undefined);
    });

    return () => {
      isMounted = false;
      void subscription.unsubscribe();
    };
  }, [canManagePushTargeting, status, user]);

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllNotificationsRead();
      const nextNotifications = await notificationService.getMyNotifications();
      setNotifications(nextNotifications);
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    }
  }

  async function handleOpenNotification(notification: UserNotification) {
    try {
      if (!notification.read) {
        await notificationService.markNotificationRead(notification.id);
        setNotifications((currentNotifications) =>
          currentNotifications.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
        );
      }
    } catch {
      // Deep links should still work even if the read mutation fails.
    }

    router.push(buildNotificationHref(notification.data));
  }

  async function handleSavePreferences() {
    setIsSavingPreferences(true);
    setFeedback(null);

    try {
      const nextPreferences = await notificationService.upsertMyPreferences({
        countyId: countyId ? Number.parseInt(countyId, 10) : null,
        townId: townId ? Number.parseInt(townId, 10) : null,
        areaId: areaId ? Number.parseInt(areaId, 10) : null
      });

      setPreferences(nextPreferences);
      setFeedback({ tone: "success", message: "Notification targeting updated." });
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function handleEnablePush() {
    if (typeof Notification === "undefined") {
      setFeedback({ tone: "error", message: "Push notifications are not supported on this device." });
      return;
    }

    setIsUpdatingPush(true);
    setFeedback(null);

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        setFeedback({ tone: "error", message: "Push permission was not granted." });
        return;
      }

      const vapidPublicKey = notificationService.getVapidPublicKey();

      if (!vapidPublicKey) {
        throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.");
      }

      const subscription = await ensureBrowserPushSubscription(vapidPublicKey);

      if (!subscription) {
        throw new Error("Unable to create a browser push subscription.");
      }

      await notificationService.savePushSubscription(serializePushSubscription(subscription));
      setIsPushEnabled(true);
      setFeedback({ tone: "success", message: "Push notifications enabled." });
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsUpdatingPush(false);
    }
  }

  async function handleDisablePush() {
    setIsUpdatingPush(true);
    setFeedback(null);

    try {
      const existingSubscription = await getExistingBrowserPushSubscription();

      if (existingSubscription) {
        await notificationService.removePushSubscription(existingSubscription.endpoint);
      }

      await removeBrowserPushSubscription();
      setIsPushEnabled(false);
      setFeedback({ tone: "success", message: "Push notifications disabled." });
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsUpdatingPush(false);
    }
  }

  if (status !== "authenticated" || !user) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Sign in to see your Manyumba notifications.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Stay on top of chats, booking updates, payments, and featured houses in the places you care about.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]">
              {notifications.filter((notification) => !notification.read).length} unread
            </Badge>
            <Button variant="outline" onClick={() => void handleMarkAllRead()}>
              Mark all read
            </Button>
          </div>
        </CardContent>
      </Card>

      {canManagePushTargeting ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Push + targeting</p>
                <p className="text-sm text-muted-foreground">
                  Choose the locations that should trigger alerts and whether this device can receive push notifications.
                </p>
              </div>
              <Badge>{pushPermission === "unsupported" ? "Unsupported" : pushPermission}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="notification-county" className="text-[11px] font-medium text-foreground">
                    County
                  </label>
                  <select
                    id="notification-county"
                    className={selectClassName}
                    value={countyId}
                    onChange={(event) => {
                      setCountyId(event.target.value);
                      setTownId("");
                      setAreaId("");
                    }}
                    disabled={isLoading}
                  >
                    <option value="">Any county</option>
                    {catalog.counties.map((county) => (
                      <option key={county.id} value={county.id}>
                        {county.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="notification-town" className="text-[11px] font-medium text-foreground">
                    Town
                  </label>
                  <select
                    id="notification-town"
                    className={selectClassName}
                    value={townId}
                    onChange={(event) => {
                      setTownId(event.target.value);
                      setAreaId("");
                    }}
                    disabled={isLoading || !countyId}
                  >
                    <option value="">{countyId ? "Any town" : "Select county first"}</option>
                    {availableTowns.map((town) => (
                      <option key={town.id} value={town.id}>
                        {town.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="notification-area" className="text-[11px] font-medium text-foreground">
                    Area
                  </label>
                  <select
                    id="notification-area"
                    className={selectClassName}
                    value={areaId}
                    onChange={(event) => setAreaId(event.target.value)}
                    disabled={isLoading || !townId}
                  >
                    <option value="">{townId ? "Any area" : "Select town first"}</option>
                    {availableAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 self-end">
                <Button variant="outline" onClick={() => void handleSavePreferences()} disabled={isSavingPreferences}>
                  {isSavingPreferences ? "Saving..." : "Save preferences"}
                </Button>
                {isPushEnabled ? (
                  <Button variant="ghost" onClick={() => void handleDisablePush()} disabled={isUpdatingPush}>
                    {isUpdatingPush ? "Disabling..." : "Disable push"}
                  </Button>
                ) : (
                  <Button onClick={() => void handleEnablePush()} disabled={isUpdatingPush || pushPermission === "unsupported"}>
                    {isUpdatingPush ? "Enabling..." : "Enable push"}
                  </Button>
                )}
              </div>
            </div>

            {preferences ? (
              <p className="text-[11px] text-muted-foreground">
                Current saved preferences:
                {" "}
                {[preferences.areaId && "Area", preferences.townId && "Town", preferences.countyId && "County"]
                  .filter(Boolean)
                  .join(" / ") || "Any location"}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {feedback ? (
        <Card className={cn(feedback.tone === "error" ? "border-rose-200" : "border-emerald-200")}>
          <CardContent className={cn("py-3 text-xs", feedback.tone === "error" ? "text-rose-700" : "text-emerald-700")}>
            {feedback.message}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">Loading notifications...</CardContent>
        </Card>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void handleOpenNotification(notification)}
              className={cn(
                "w-full rounded-2xl border border-border/80 bg-white/95 text-left shadow-sm transition hover:border-primary/35 hover:bg-primary/5",
                !notification.read ? "border-primary/30" : ""
              )}
            >
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <Badge>{getNotificationBadge(notification.type)}</Badge>
                      {!notification.read ? (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatNotificationTimestamp(notification.createdAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-2 py-6">
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground">
              Manyumba will show chats, bookings, payments, and featured houses here as soon as they reach you.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
