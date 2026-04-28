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

  return <PreBookedList items={bookings} />;
}
