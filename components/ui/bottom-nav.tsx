"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { buildLoginRedirect } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type BottomNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
};

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}

function BookingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M7 11h10M7 15h6" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M19 20a7 7 0 0 0-14 0" />
      <circle cx="12" cy="8" r="3.5" />
    </svg>
  );
}

const navigationItems: BottomNavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/bookings", label: "Bookings", icon: BookingsIcon, requiresAuth: true },
  { href: "/profile", label: "Profile", icon: ProfileIcon, requiresAuth: true }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/listing/") || pathname.startsWith("/houses") || pathname.startsWith("/deposit/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const { status } = useAuthStore();

  if (
    pathname.startsWith("/auth/callback") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/landlord")
  ) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid h-14 max-w-xl grid-cols-3 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href);
          const href = item.requiresAuth && status !== "authenticated" ? buildLoginRedirect(item.href) : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium transition",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
