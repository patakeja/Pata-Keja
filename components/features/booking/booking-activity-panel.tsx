"use client";

import { useEffect, useState } from "react";

import { DashboardTabs } from "@/components/features/booking/dashboard-tabs";
import { PreBookedList } from "@/components/features/booking/prebooked-list";
import { Card, CardContent } from "@/components/ui/card";
import { bookingService } from "@/lib/bookingService";
import { listingService } from "@/lib/listingService";
import type { ListingPreview, UserBooking } from "@/types";

type BookingActivityPanelProps = {
  mode: "dashboard" | "bookings";
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading booking activity.";
}

export function BookingActivityPanel({ mode }: BookingActivityPanelProps) {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [savedHouses, setSavedHouses] = useState<ListingPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [nextBookings, nextSavedHouses] = await Promise.all([
          bookingService.getUserBookings(),
          mode === "dashboard" ? listingService.getPublicListings({ limit: 3 }) : Promise.resolve<ListingPreview[]>([])
        ]);

        if (isMounted) {
          setBookings(nextBookings);
          setSavedHouses(nextSavedHouses);
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
  }, [mode]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading booking activity...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-rose-700">{error}</CardContent>
      </Card>
    );
  }

  if (mode === "bookings") {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Pre-booked Houses</h2>
            <p className="text-xs text-muted-foreground">
              Deposit state, remaining rent, and countdowns stay visible here for quick follow-up.
            </p>
          </CardContent>
        </Card>
        <PreBookedList items={bookings} />
      </div>
    );
  }

  const activeBookings = bookings.filter((booking) => booking.status === "active");

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Saved Houses</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{savedHouses.length}</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Pre-booked</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{bookings.length}</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Active Holds</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{activeBookings.length}</p>
          </div>
        </CardContent>
      </Card>

      <DashboardTabs savedHouses={savedHouses} preBookedHouses={bookings} />
    </div>
  );
}
