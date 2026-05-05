"use client";

import { useEffect, useState, type FormEvent } from "react";

import { RentalSource, type PlatformBookingOption } from "@/types";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LandlordRentalDialogSubmitPayload = {
  source: RentalSource;
  bookingIds: string[];
  unitsCount: number;
  notes: string;
};

type LandlordRentalDialogProps = {
  isOpen: boolean;
  isSaving: boolean;
  isLoadingOptions: boolean;
  error: string | null;
  availableUnits: number;
  bookingCapacityPerUnit: number;
  platformBookings: PlatformBookingOption[];
  onClose: () => void;
  onSubmit: (payload: LandlordRentalDialogSubmitPayload) => void | Promise<void>;
};

export function LandlordRentalDialog({
  isOpen,
  isSaving,
  isLoadingOptions,
  error,
  availableUnits,
  bookingCapacityPerUnit,
  platformBookings,
  onClose,
  onSubmit
}: LandlordRentalDialogProps) {
  const [source, setSource] = useState<RentalSource>(RentalSource.PLATFORM);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [unitsCount, setUnitsCount] = useState(1);
  const [notes, setNotes] = useState("");
  const platformUnitsLimit = Math.min(availableUnits, platformBookings.length);
  const nextAvailableUnits = Math.max(0, availableUnits - unitsCount);
  const nextActiveBookingCapacity = nextAvailableUnits * bookingCapacityPerUnit;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSource(RentalSource.PLATFORM);
    setBookingIds([]);
    setUnitsCount(1);
    setNotes("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || source !== RentalSource.PLATFORM) {
      return;
    }

    if (platformUnitsLimit === 0) {
      if (bookingIds.length > 0) {
        setBookingIds([]);
      }
      return;
    }

    const cappedUnitsCount = Math.min(Math.max(unitsCount, 1), platformUnitsLimit);

    if (cappedUnitsCount !== unitsCount) {
      setUnitsCount(cappedUnitsCount);
      return;
    }

    const validBookingIds = bookingIds.filter((bookingId) => platformBookings.some((booking) => booking.id === bookingId));
    const nextBookingIds = validBookingIds.slice(0, cappedUnitsCount);

    for (const booking of platformBookings) {
      if (nextBookingIds.length >= cappedUnitsCount) {
        break;
      }

      if (!nextBookingIds.includes(booking.id)) {
        nextBookingIds.push(booking.id);
      }
    }

    if (nextBookingIds.join("|") !== bookingIds.join("|")) {
      setBookingIds(nextBookingIds);
    }
  }, [bookingIds, isOpen, platformBookings, platformUnitsLimit, source, unitsCount]);

  if (!isOpen) {
    return null;
  }

  function handleUnitsCountChange(value: string) {
    const parsedValue = Number.parseInt(value, 10);
    const maxUnits = source === RentalSource.PLATFORM ? Math.max(platformUnitsLimit, 1) : Math.max(availableUnits, 1);

    if (!Number.isFinite(parsedValue)) {
      setUnitsCount(1);
      return;
    }

    setUnitsCount(Math.min(Math.max(parsedValue, 1), maxUnits));
  }

  function toggleBookingSelection(bookingId: string) {
    setBookingIds((currentBookingIds) => {
      if (currentBookingIds.includes(bookingId)) {
        return currentBookingIds.filter((currentBookingId) => currentBookingId !== bookingId);
      }

      if (currentBookingIds.length >= unitsCount) {
        return currentBookingIds;
      }

      return [...currentBookingIds, bookingId];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      source,
      bookingIds: source === RentalSource.PLATFORM ? bookingIds : [],
      unitsCount,
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
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            This house currently has {availableUnits} available unit{availableUnits === 1 ? "" : "s"} and{" "}
            {availableUnits * bookingCapacityPerUnit} active booking slot
            {availableUnits * bookingCapacityPerUnit === 1 ? "" : "s"}.
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSource(RentalSource.PLATFORM);
                setUnitsCount(1);
              }}
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
              onClick={() => {
                setSource(RentalSource.EXTERNAL);
                setBookingIds([]);
              }}
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

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">Units rented</label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              type="number"
              min="1"
              max={source === RentalSource.PLATFORM ? Math.max(platformUnitsLimit, 1) : Math.max(availableUnits, 1)}
              step="1"
              value={unitsCount}
              onChange={(event) => handleUnitsCountChange(event.target.value)}
              disabled={isSaving || (source === RentalSource.PLATFORM && platformUnitsLimit === 0)}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              After this update there will be {nextAvailableUnits} available unit
              {nextAvailableUnits === 1 ? "" : "s"} and {nextActiveBookingCapacity} booking slot
              {nextActiveBookingCapacity === 1 ? "" : "s"} left.
            </p>
          </div>

          {source === RentalSource.PLATFORM ? (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">Linked bookings</label>
              {isLoadingOptions ? (
                <p className="text-[11px] text-muted-foreground">Loading active bookings...</p>
              ) : platformBookings.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No active platform bookings are waiting for this house.</p>
              ) : (
                <div className="space-y-2 rounded-md border border-border bg-white p-2">
                  <p className="text-[11px] text-muted-foreground">
                    Select exactly {unitsCount} active booking{unitsCount === 1 ? "" : "s"} to complete.
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {platformBookings.map((booking) => {
                      const isChecked = bookingIds.includes(booking.id);
                      const disableSelection = !isChecked && bookingIds.length >= unitsCount;

                      return (
                        <label
                          key={booking.id}
                          className={cn(
                            "flex items-start gap-2 rounded-md border px-2 py-2 text-xs transition",
                            isChecked ? "border-primary bg-primary/5" : "border-border bg-background",
                            disableSelection ? "opacity-60" : ""
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleBookingSelection(booking.id)}
                            disabled={isSaving || disableSelection}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground">{booking.tenantName}</span>
                            <span className="block text-muted-foreground">
                              Booked on {new Date(booking.createdAt).toLocaleDateString("en-KE")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              External rentals are logged for admin review automatically and reduce available units immediately.
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
              disabled={
                isSaving ||
                availableUnits < 1 ||
                (source === RentalSource.PLATFORM && bookingIds.length !== unitsCount)
              }
            >
              {isSaving ? "Saving..." : "Confirm rental"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
