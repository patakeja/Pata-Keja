"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PaymentStatusBadge } from "@/components/features/booking/payment-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildRestrictedActionRedirect, getCurrentUser, getSession } from "@/lib/auth";
import { getStkPaymentStatus, paymentService, startStkPayment } from "@/lib/paymentService";
import { cn } from "@/lib/utils";
import { PaymentStatus, RestrictedAction } from "@/types";
import type { RentCheckout } from "@/types";

type RentPaymentPanelProps = {
  bookingId: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while preparing the rent payment.";
}

export function RentPaymentPanel({ bookingId }: RentPaymentPanelProps) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<RentCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const session = await getSession();

        if (!session?.access_token) {
          router.replace(buildRestrictedActionRedirect(RestrictedAction.BOOK, `/bookings/${bookingId}/rent`));
          return;
        }

        const [user, nextCheckout] = await Promise.all([
          getCurrentUser().catch(() => null),
          paymentService.getRentCheckout(bookingId)
        ]);

        if (isMounted) {
          setCheckout(nextCheckout);
          setPhone(user?.phone ?? "");
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
  }, [bookingId, router]);

  useEffect(() => {
    if (!pendingPaymentId || !isPolling) {
      return undefined;
    }

    let isMounted = true;
    const poll = async () => {
      try {
        const statusResult = await getStkPaymentStatus(pendingPaymentId);

        if (!isMounted) {
          return;
        }

        if (
          statusResult.payment.status === PaymentStatus.COMPLETED ||
          statusResult.payment.status === PaymentStatus.CONFIRMED
        ) {
          setIsPolling(false);
          router.push("/bookings?payment=rent-completed");
          return;
        }

        if (statusResult.payment.status === PaymentStatus.FAILED) {
          setIsPolling(false);
          setPendingPaymentId(null);
          setError(statusResult.payment.providerResultDesc ?? "The M-Pesa payment failed or was cancelled.");
        }
      } catch (pollError) {
        if (isMounted) {
          setError(getErrorMessage(pollError));
          setIsPolling(false);
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, 5000);

    void poll();

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isPolling, pendingPaymentId, router]);

  async function handlePayRent() {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const session = await getSession();

      if (!session?.access_token) {
        router.push(buildRestrictedActionRedirect(RestrictedAction.BOOK, `/bookings/${bookingId}/rent`));
        return;
      }

      if (!phone.trim()) {
        throw new Error("Enter the Safaricom number that should receive the STK push.");
      }

      const paymentResponse = await startStkPayment({
        bookingId,
        phone
      });

      setPendingPaymentId(paymentResponse.payment.id);
      setStatusMessage(paymentResponse.customerMessage || "Waiting for the M-Pesa payment prompt...");

      if (
        paymentResponse.payment.status === PaymentStatus.COMPLETED ||
        paymentResponse.payment.status === PaymentStatus.CONFIRMED
      ) {
        router.push("/bookings?payment=rent-completed");
        return;
      }

      setIsPolling(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading rent checkout...</CardContent>
      </Card>
    );
  }

  if (!checkout) {
    return (
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-sm font-semibold text-foreground">Rent checkout unavailable</h1>
          <p className="text-xs text-muted-foreground">{error ?? "The booking could not be prepared for rent payment."}</p>
          <Link href="/bookings" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to bookings
          </Link>
        </CardContent>
      </Card>
    );
  }

  const canPayRent =
    checkout.bookingStatus === "active" &&
    (checkout.depositPaymentStatus === "confirmed" || checkout.depositPaymentStatus === "completed") &&
    checkout.remainingRentAmount > 0 &&
    checkout.rentPaymentStatus !== "pending" &&
    checkout.rentPaymentStatus !== "confirmed" &&
    checkout.rentPaymentStatus !== "completed";

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-foreground">Pay remaining rent</h1>
              <p className="text-xs text-muted-foreground">{checkout.title}</p>
              <p className="text-[11px] text-muted-foreground">{checkout.areaLabel}</p>
            </div>
            <PaymentStatusBadge status={checkout.bookingStatus} />
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Listing price</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(checkout.listingPrice)}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deposit paid</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(checkout.depositPaidAmount)}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Remaining rent</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(checkout.remainingRentAmount)}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Refunded</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(checkout.refundAmount)}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-xs">
              <span className="text-muted-foreground">Deposit status</span>
              <span className="shrink-0">
                {checkout.depositPaymentStatus ? <PaymentStatusBadge status={checkout.depositPaymentStatus} /> : "Missing"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-xs">
              <span className="text-muted-foreground">Rent status</span>
              <span className="shrink-0">
                {checkout.rentPaymentStatus ? <PaymentStatusBadge status={checkout.rentPaymentStatus} /> : "Not started"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="254708374149"
                disabled={isSubmitting || isPolling}
              />
              <Button size="lg" onClick={handlePayRent} disabled={!canPayRent || isSubmitting || isPolling}>
                {isSubmitting ? "Sending STK..." : isPolling ? "Waiting for payment..." : "Pay Rent"}
              </Button>
              {statusMessage ? <p className="text-[11px] text-muted-foreground">{statusMessage}</p> : null}
            </div>
            <Link href="/bookings" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Back to bookings
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rent payments will stay pending until the Daraja callback confirms the STK payment.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-3 text-xs text-rose-700">{error}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
