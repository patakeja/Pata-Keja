"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { landlordService } from "@/lib/landlordService";
import type { LandlordDashboardSummary } from "@/types";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading the landlord portal.";
}

export function LandlordDashboardPanel() {
  const [summary, setSummary] = useState<LandlordDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const nextSummary = await landlordService.getDashboardSummary();

        if (isMounted) {
          setSummary(nextSummary);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading landlord dashboard...</CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-rose-700">{error ?? "Landlord data is unavailable."}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-foreground">Landlord dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Track your houses, available stock, and booking queue activity with a compact mobile-first view.
              </p>
            </div>
            <Link href="/landlord/listings" className={buttonVariants({ variant: "outline", size: "md" })}>
              My Houses
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total houses</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.totalHouses}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Available units</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.totalAvailableUnits}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Active bookings</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.activeBookings}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Coming soon</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.comingSoonHouses}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Image refresh</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.staleImageListings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-white px-2 py-2">
            <p className="text-xs font-semibold text-foreground">Manage availability fast</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Available units now drive your booking capacity automatically through the admin multiplier.
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-white px-2 py-2">
            <p className="text-xs font-semibold text-foreground">Review image freshness</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {summary.staleImageListings > 0
                ? `${summary.staleImageListings} houses should refresh photos soon.`
                : "Your image gallery is in good shape right now."}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-white px-2 py-2">
            <p className="text-xs font-semibold text-foreground">External rental alerts</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {summary.pendingExternalRentalAlerts > 0
                ? `${summary.pendingExternalRentalAlerts} external rentals are waiting for admin review.`
                : "No external rental reviews are waiting."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
