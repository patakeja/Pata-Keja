"use client";

import { useEffect, useState } from "react";

import { PreBookedList } from "@/components/features/booking/prebooked-list";
import { Card, CardContent } from "@/components/ui/card";
import { bookingService } from "@/lib/bookingService";
import type { UserBooking } from "@/types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading booking activity.";
}

export function BookingActivityPanel() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const nextBookings = await bookingService.getUserBookings();

        if (isMounted) {
          setBookings(nextBookings);
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

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total bookings</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{bookings.length}</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Active Holds</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {bookings.filter((booking) => booking.status === "active").length}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Bookings</h2>
          <p className="text-xs text-muted-foreground">
            Deposit state, remaining rent, and expiry countdowns stay visible here for quick follow-up.
          </p>
        </CardContent>
      </Card>

      <PreBookedList items={bookings} />
    </div>
  );
}
