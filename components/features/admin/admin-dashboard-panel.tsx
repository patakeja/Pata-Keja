"use client";

import { useEffect, useState } from "react";

import { adminService } from "@/lib/adminService";
import type { AdminDashboardSummary, RentalLogRecord } from "@/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading admin operations.";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AdminDashboardPanel() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<RentalLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [nextSummary, nextAlerts] = await Promise.all([
          adminService.getDashboardSummary(),
          adminService.getPendingExternalRentalAlerts()
        ]);

        if (isMounted) {
          setSummary(nextSummary);
          setAlerts(nextAlerts);
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
        <CardContent className="py-6 text-xs text-muted-foreground">Loading admin operations...</CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-rose-700">{error ?? "Admin data is unavailable."}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Admin overview</h1>
            <p className="text-xs text-muted-foreground">
              Watch platform growth, landlord access, and external rental escalations from one compact workspace.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Users</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.totalUsers}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Landlords</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.totalLandlords}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Active listings</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.activeListings}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">External alerts</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{summary.pendingExternalRentalAlerts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">External rental review queue</h2>
              <p className="text-xs text-muted-foreground">
                These rentals were marked outside the platform and should be reviewed by operations.
              </p>
            </div>
            <Badge>{alerts.length} open</Badge>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-border/70 bg-white px-2 py-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">Listing {alert.listingId.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Logged {formatDateTime(alert.createdAt)}
                      </p>
                    </div>
                    <Badge>Needs review</Badge>
                  </div>
                  {alert.notes ? <p className="mt-2 text-[11px] text-muted-foreground">{alert.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No pending external rental alerts right now.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
