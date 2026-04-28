"use client";

import { useEffect, useState, type FormEvent } from "react";

import { RentalSource, type PlatformBookingOption } from "@/types";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LandlordRentalDialogSubmitPayload = {
  source: RentalSource;
  bookingId: string | null;
  notes: string;
};

type LandlordRentalDialogProps = {
  isOpen: boolean;
  isSaving: boolean;
  isLoadingOptions: boolean;
  error: string | null;
  platformBookings: PlatformBookingOption[];
  onClose: () => void;
  onSubmit: (payload: LandlordRentalDialogSubmitPayload) => void | Promise<void>;
};

export function LandlordRentalDialog({
  isOpen,
  isSaving,
  isLoadingOptions,
  error,
  platformBookings,
  onClose,
  onSubmit
}: LandlordRentalDialogProps) {
  const [source, setSource] = useState<RentalSource>(RentalSource.PLATFORM);
  const [bookingId, setBookingId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSource(RentalSource.PLATFORM);
    setBookingId("");
    setNotes("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || bookingId || platformBookings.length === 0) {
      return;
    }

    setBookingId(platformBookings[0]?.id ?? "");
  }, [bookingId, isOpen, platformBookings]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      source,
      bookingId: source === RentalSource.PLATFORM ? bookingId : null,
      notes
    });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 p-3">
      <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Mark as rented</h2>
            <p className="text-[11px] text-muted-foreground">Choose how this unit was rented out.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Close
          </Button>
        </div>

        <form className="space-y-3 p-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSource(RentalSource.PLATFORM)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-medium transition",
                source === RentalSource.PLATFORM
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground"
              )}
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => setSource(RentalSource.EXTERNAL)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-medium transition",
                source === RentalSource.EXTERNAL
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground"
              )}
            >
              External
            </button>
          </div>

          {source === RentalSource.PLATFORM ? (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">Linked booking</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
                disabled={isSaving || isLoadingOptions}
                required
              >
                <option value="">Select booking</option>
                {platformBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.tenantName} - {new Date(booking.createdAt).toLocaleDateString("en-KE")}
                  </option>
                ))}
              </select>
              {isLoadingOptions ? (
                <p className="text-[11px] text-muted-foreground">Loading active bookings...</p>
              ) : platformBookings.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No active platform bookings are waiting for this house.</p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              External rentals are logged for admin review automatically.
            </p>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">Notes</label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSaving}
              placeholder="Optional context for the rental event"
            />
          </div>

          {error ? <p className="text-xs text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || (source === RentalSource.PLATFORM && !bookingId)}
            >
              {isSaving ? "Saving..." : "Confirm rental"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
