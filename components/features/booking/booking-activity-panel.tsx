"use client";

import { useEffect, useMemo, useState } from "react";

import { PreBookedList } from "@/components/features/booking/prebooked-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { bookingService } from "@/lib/bookingService";
import { BookingStatus, type UserBooking } from "@/types";

type BookingFilter = "all" | "actionable" | BookingStatus;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading booking activity.";
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtTime = new Date(expiresAt).getTime();
  const now = Date.now();

  return expiresAtTime > now && expiresAtTime - now <= 24 * 60 * 60 * 1000;
}

function requiresAttention(booking: UserBooking) {
  return (
    booking.status === BookingStatus.ACTIVE &&
    (!booking.depositPaid || booking.paymentSummary.canPayRent || isExpiringSoon(booking.expiresAt))
  );
}

function matchesSearch(booking: UserBooking, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    booking.listing.title,
    booking.listing.areaName,
    booking.listing.townName,
    booking.listing.countyName
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function BookingActivityPanel() {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingFilter>("all");

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

  const activeCount = useMemo(
    () => bookings.filter((booking) => booking.status === BookingStatus.ACTIVE).length,
    [bookings]
  );
  const completedCount = useMemo(
    () => bookings.filter((booking) => booking.status === BookingStatus.COMPLETED).length,
    [bookings]
  );
  const actionableCount = useMemo(() => bookings.filter(requiresAttention).length, [bookings]);
  const expiringSoonCount = useMemo(() => bookings.filter((booking) => isExpiringSoon(booking.expiresAt)).length, [bookings]);
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "actionable"
            ? requiresAttention(booking)
            : booking.status === statusFilter;

      return matchesStatus && matchesSearch(booking, query);
    });
  }, [bookings, query, statusFilter]);

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
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Bookings</h1>
            <p className="text-sm text-muted-foreground">
              Track reservation holds, deposit progress, rent follow-up, and completed stays from one place.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by house, area, town, or county"
              className="h-11"
              aria-label="Search bookings"
            />

            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" as const },
                { label: "Actionable", value: "actionable" as const },
                { label: "Active", value: BookingStatus.ACTIVE },
                { label: "Completed", value: BookingStatus.COMPLETED },
                { label: "Expired", value: BookingStatus.EXPIRED }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={statusFilter === option.value ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{bookings.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Every booking tied to your account.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Active</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{activeCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Live reservation windows and current stays.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Needs attention</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{actionableCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Deposit, rent, or expiring hold items to review.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{completedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {expiringSoonCount > 0 ? `${expiringSoonCount} active hold(s) expire within 24 hours.` : "No urgent expiries right now."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredBookings.length === 0 && bookings.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 py-6">
            <p className="text-sm font-semibold text-foreground">No bookings match this view</p>
            <p className="text-sm text-muted-foreground">
              Try another search term or switch the filter to see more reservation activity.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PreBookedList items={filteredBookings} />
      )}
    </div>
  );
}
