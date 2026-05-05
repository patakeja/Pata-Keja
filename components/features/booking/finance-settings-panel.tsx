"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { paymentService } from "@/lib/paymentService";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading finance settings.";
}

export function FinanceSettingsPanel() {
  const [refundPercentage, setRefundPercentage] = useState("90");
  const [bookingCapacityMultiplier, setBookingCapacityMultiplier] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const settings = await paymentService.getFinanceSettings();

        if (isMounted) {
          setRefundPercentage(String(Math.round(settings.refundPercentage * 100)));
          setBookingCapacityMultiplier(String(settings.bookingCapacityMultiplier));
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

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const numericValue = Number(refundPercentage);

      if (!Number.isFinite(numericValue)) {
        throw new Error("Refund percentage must be a valid number.");
      }

      const numericMultiplier = Number(bookingCapacityMultiplier);

      if (!Number.isFinite(numericMultiplier)) {
        throw new Error("Booking capacity multiplier must be a valid number.");
      }

      const settings = await paymentService.updateFinanceSettings(numericValue / 100, numericMultiplier);
      setRefundPercentage(String(Math.round(settings.refundPercentage * 100)));
      setBookingCapacityMultiplier(String(settings.bookingCapacityMultiplier));
      setMessage("Finance settings updated.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Refund settings</h2>
          <p className="text-xs text-muted-foreground">
            This percentage is applied to confirmed deposit payments when expired bookings are refunded.
            The booking multiplier below is used as the default queue-per-unit value for newly created houses.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,180px)_auto] sm:items-end">
          <div className="space-y-1">
            <label htmlFor="refundPercentage" className="text-[11px] font-medium text-foreground">
              Refund percentage
            </label>
            <Input
              id="refundPercentage"
              type="number"
              min="0"
              max="100"
              step="1"
              value={refundPercentage}
              onChange={(event) => setRefundPercentage(event.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="bookingCapacityMultiplier" className="text-[11px] font-medium text-foreground">
              Default booking multiplier
            </label>
            <Input
              id="bookingCapacityMultiplier"
              type="number"
              min="1"
              max="10"
              step="1"
              value={bookingCapacityMultiplier}
              onChange={(event) => setBookingCapacityMultiplier(event.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? "Saving..." : "Update settings"}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Current rate</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{refundPercentage}%</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Default queue rule</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{bookingCapacityMultiplier}x per unit</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deposit policy</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Applies on expired holds only</p>
          </div>
        </div>

        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
