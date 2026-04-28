"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/features/auth/logout-button";
import { getRoleHomePath } from "@/lib/auth";
import { useAuthStore } from "@/store";
import { UserRole } from "@/types";

import { buttonVariants } from "./button";
import { Input } from "./input";
import { PageShell } from "./page-shell";

export function SiteHeader() {
  const pathname = usePathname();
  const { status, user } = useAuthStore();
  const dashboardHref = user ? getRoleHomePath(user.role) : "/login";
  const homeHref = user?.role === UserRole.ADMIN ? dashboardHref : "/home";
  const shouldShowPublicBrowse = user?.role !== UserRole.ADMIN;
  const dashboardLabel =
    user?.role === UserRole.LANDLORD ? "Landlord Portal" : user?.role === UserRole.ADMIN ? "Admin Portal" : "Dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
      <PageShell className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:gap-3">
        <Link href={homeHref} className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            PK
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">Pata Keja</p>
            <p className="truncate text-[11px] text-muted-foreground">Rent and short stay</p>
          </div>
        </Link>

        {shouldShowPublicBrowse ? (
          <form action="/houses" className="w-full md:flex-1">
            <label htmlFor="site-search" className="sr-only">
              Search houses
            </label>
            <Input
              id="site-search"
              name="q"
              placeholder="Search by title or area"
              className="w-full bg-white"
            />
          </form>
        ) : (
          <div className="hidden md:block md:flex-1" />
        )}

        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <span className="rounded-md border border-border bg-white px-3 py-2 text-[11px] text-muted-foreground">
              Loading account...
            </span>
          ) : null}

          {status === "authenticated" && user ? (
            <>
              <Link
                href={dashboardHref}
                className={buttonVariants({ variant: pathname.startsWith(dashboardHref) ? "primary" : "outline", size: "md" })}
              >
                {dashboardLabel}
              </Link>
              <LogoutButton variant="ghost" size="md">
                Log out
              </LogoutButton>
            </>
          ) : null}

          {status === "unauthenticated" ? (
            <>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "md" })}>
                Login
              </Link>
              <Link href="/signup" className={buttonVariants({ size: "md" })}>
                Sign Up
              </Link>
            </>
          ) : null}
        </div>
      </PageShell>
    </header>
  );
}
