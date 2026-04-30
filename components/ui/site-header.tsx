"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/features/auth/logout-button";
import { APP_NAME } from "@/config/app";
import { getRoleHomePath } from "@/lib/auth";
import { useAuthStore } from "@/store";
import { UserRole } from "@/types";

import { BrandLogo } from "./brand-logo";
import { buttonVariants } from "./button";
import { Input } from "./input";
import { PageShell } from "./page-shell";

export function SiteHeader() {
  const pathname = usePathname();
  const { status, user } = useAuthStore();
  const primaryActionHref = user ? getRoleHomePath(user.role) : "/login";
  const homeHref = user?.role === UserRole.ADMIN ? primaryActionHref : "/";
  const shouldShowPublicBrowse = user?.role !== UserRole.ADMIN;
  const isHomePage = pathname === "/";
  const primaryActionLabel =
    user?.role === UserRole.LANDLORD ? "Landlord Portal" : user?.role === UserRole.ADMIN ? "Admin Portal" : "Bookings";

  if (isHomePage) {
    return (
      <header className="border-b border-border/70 bg-white/92">
        <PageShell className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Link href={homeHref} className="flex flex-col items-center gap-3">
              <BrandLogo
                className="justify-center"
                imageClassName="h-24 sm:h-28"
                fallbackClassName="text-4xl sm:text-5xl"
              />
              <div className="space-y-1">
                <p className="font-[family:var(--font-display)] text-3xl font-semibold uppercase tracking-[0.22em] text-foreground sm:text-4xl">
                  {APP_NAME}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-muted-foreground sm:text-xs">
                  Rentals &amp; Short stays
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {status === "loading" ? (
                <span className="rounded-xl border border-border bg-white px-3 py-2 text-[11px] text-muted-foreground">
                  Loading account...
                </span>
              ) : null}

              {status === "authenticated" && user ? (
                <>
                  <Link href={primaryActionHref} className={buttonVariants({ size: "md" })}>
                    {primaryActionLabel}
                  </Link>
                  <LogoutButton variant="outline" size="md">
                    Log out
                  </LogoutButton>
                </>
              ) : null}

              {status === "unauthenticated" ? (
                <>
                  <Link href="/login" className={buttonVariants({ variant: "outline", size: "md" })}>
                    Sign in
                  </Link>
                  <Link href="/signup" className={buttonVariants({ size: "md" })}>
                    Create account
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </PageShell>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-white/85 backdrop-blur-xl">
      <PageShell className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-4">
        <Link href={homeHref} className="flex min-w-0 items-center gap-3">
          <BrandLogo
            className="shrink-0 justify-start"
            imageClassName="h-12 md:h-14"
            fallbackClassName="text-2xl md:text-3xl"
          />
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground sm:inline">
            Find and book houses easily
          </span>
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
              className="w-full"
            />
          </form>
        ) : (
          <div className="hidden md:block md:flex-1" />
        )}

        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <span className="rounded-xl border border-border bg-white px-3 py-2 text-[11px] text-muted-foreground">
              Loading account...
            </span>
          ) : null}

          {status === "authenticated" && user ? (
            <>
              <Link
                href={primaryActionHref}
                className={buttonVariants({
                  variant: pathname.startsWith(primaryActionHref) ? "primary" : "outline",
                  size: "md"
                })}
              >
                {primaryActionLabel}
              </Link>
              <LogoutButton variant="ghost" size="md">
                Log out
              </LogoutButton>
            </>
          ) : null}

          {status === "unauthenticated" ? (
            <>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "md" })}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonVariants({ size: "md" })}>
                Create account
              </Link>
            </>
          ) : null}
        </div>
      </PageShell>
    </header>
  );
}
