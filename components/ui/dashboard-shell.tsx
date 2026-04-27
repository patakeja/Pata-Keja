"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

import { PageShell } from "./page-shell";

type DashboardShellProps = {
  title: string;
  subtitle: string;
  navigation: NavigationItem[];
  children: ReactNode;
};

export function DashboardShell({ title, subtitle, navigation, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <PageShell className="grid gap-8 py-10 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[28px] border border-border/70 bg-white/85 p-6 shadow-soft">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </div>

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-2xl px-4 py-3 transition hover:bg-muted",
                  isActive ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground"
                )}
              >
                <p className="font-medium">{item.label}</p>
                {item.description ? (
                  <p className={cn("mt-1 text-sm", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {item.description}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="space-y-6">{children}</main>
    </PageShell>
  );
}
