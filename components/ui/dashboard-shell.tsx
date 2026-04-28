"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/features/auth/logout-button";
import type { NavigationItem } from "@/config/navigation";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

import { Badge } from "./badge";
import { PageShell } from "./page-shell";

type DashboardShellProps = {
  title: string;
  subtitle: string;
  navigation: NavigationItem[];
  children: ReactNode;
};

export function DashboardShell({ title, subtitle, navigation, children }: DashboardShellProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <PageShell className="grid gap-3 py-3 lg:grid-cols-[210px_1fr]">
      <aside className="rounded-lg border border-border/70 bg-white p-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Workspace</p>
          <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs leading-5 text-muted-foreground">{subtitle}</p>
        </div>

        {user ? (
          <div className="mt-3 rounded-md border border-border/70 bg-muted/30 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{user.fullName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
              <Badge>{user.role}</Badge>
            </div>
            <LogoutButton className="mt-2 w-full" variant="outline" size="sm">
              Log out
            </LogoutButton>
          </div>
        ) : null}

        <nav className="mt-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-2 py-2 transition hover:bg-muted",
                  isActive ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground"
                )}
              >
                <p className="text-xs font-medium">{item.label}</p>
                {item.description ? (
                  <p className={cn("mt-0.5 text-[11px]", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {item.description}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="space-y-3">{children}</main>
    </PageShell>
  );
}
