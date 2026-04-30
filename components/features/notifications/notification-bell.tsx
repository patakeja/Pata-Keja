"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { buildLoginRedirect } from "@/lib/auth";
import { notificationService } from "@/lib/notificationService";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path d="M12 4.5a4 4 0 0 0-4 4v2.2c0 .9-.3 1.8-.8 2.5L5.5 16h13l-1.7-2.8a4.8 4.8 0 0 1-.8-2.5V8.5a4 4 0 0 0-4-4Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function NotificationBell() {
  const pathname = usePathname();
  const { status, user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setUnreadCount(0);
      return undefined;
    }

    let isMounted = true;

    const loadCount = async () => {
      try {
        const nextCount = await notificationService.getUnreadNotificationCount();

        if (isMounted) {
          setUnreadCount(nextCount);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0);
        }
      }
    };

    void loadCount();

    const subscription = notificationService.subscribeToNotificationFeed(user.id, () => {
      void loadCount();
    });

    return () => {
      isMounted = false;
      void subscription.unsubscribe();
    };
  }, [status, user]);

  if (pathname.startsWith("/auth/callback")) {
    return null;
  }

  const href = status === "authenticated" ? "/notifications" : buildLoginRedirect("/notifications");
  const isActive = pathname === "/notifications";

  return (
    <Link
      href={href}
      className={cn(
        "fixed right-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-white/95 text-primary shadow-lg backdrop-blur transition hover:border-primary/40 hover:bg-primary/5",
        isActive ? "border-primary/55 bg-primary/5 text-primary" : ""
      )}
      aria-label="Notifications"
    >
      <BellIcon className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
