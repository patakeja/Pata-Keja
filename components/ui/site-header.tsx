"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { publicNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

import { buttonVariants } from "./button";
import { PageShell } from "./page-shell";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
      <PageShell className="flex min-h-20 items-center justify-between gap-4">
        <Link href="/home" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            PK
          </span>
          <div>
            <p className="font-semibold tracking-tight text-foreground">Pata Keja</p>
            <p className="text-sm text-muted-foreground">Scalable property operations</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {publicNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-white hover:text-foreground",
                  isActive && "bg-white text-foreground shadow-sm"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/landlord/dashboard" className={buttonVariants({ variant: "outline", size: "md" })}>
          Landlord Workspace
        </Link>
      </PageShell>
    </header>
  );
}
