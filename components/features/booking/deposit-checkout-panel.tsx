"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PrebookPanel } from "@/components/features/booking/prebook-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildRestrictedActionRedirect, getCurrentUser } from "@/lib/auth";
import { getStkPaymentStatus, paymentService, startStkPayment } from "@/lib/paymentService";
import { PaymentStatus, RestrictedAction } from "@/types";
import type { DepositCheckout } from "@/types";

type DepositCheckoutPanelProps = {
  listingId: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while preparing the deposit flow.";
}

export function DepositCheckoutPanel({ listingId }: DepositCheckoutPanelProps) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<DepositCheckout | null>(null);
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
        const user = await getCurrentUser();

        if (!user) {
          router.replace(buildRestrictedActionRedirect(RestrictedAction.BOOK, `/deposit/${listingId}`));
          return;
        }

        if (isMounted) {
          setPhone(user.phone ?? "");
        }

        const nextCheckout = await paymentService.getDepositCheckout(listingId);

        if (isMounted) {
          setCheckout(nextCheckout);
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
  }, [listingId, router]);

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
          router.push("/bookings?payment=deposit-confirmed");
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

  async function handlePayAndReserve() {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const user = await getCurrentUser();

      if (!user) {
        router.push(buildRestrictedActionRedirect(RestrictedAction.BOOK, `/deposit/${listingId}`));
        return;
      }

      if (!phone.trim()) {
        throw new Error("Enter the Safaricom number that should receive the STK push.");
      }

      const paymentResponse = await startStkPayment({
        listingId,
        phone
      });

      setPendingPaymentId(paymentResponse.payment.id);
      setStatusMessage(paymentResponse.customerMessage || "Waiting for the M-Pesa payment prompt...");

      if (
        paymentResponse.payment.status === PaymentStatus.COMPLETED ||
        paymentResponse.payment.status === PaymentStatus.CONFIRMED
      ) {
        router.push("/bookings?payment=deposit-confirmed");
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
        <CardContent className="py-6 text-xs text-muted-foreground">Loading deposit checkout...</CardContent>
      </Card>
    );
  }

  if (!checkout) {
    return (
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-sm font-semibold text-foreground">Deposit checkout unavailable</h1>
          <p className="text-xs text-muted-foreground">{error ?? "The listing could not be prepared for deposit payment."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <PrebookPanel
        title={checkout.title}
        priceLabel={checkout.priceLabel}
        areaLabel={checkout.areaLabel}
        refundPercentage={checkout.refundPercentage}
        quote={{
          depositAmount: checkout.depositAmount,
          holdDurationHours: checkout.holdDurationHours,
          refundExplanation:
            "If the booking expires before rent is completed, the deposit follows the configured refund policy."
        }}
        action={
          <div className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="deposit-phone" className="text-[11px] font-medium text-foreground">
                M-Pesa phone number
              </label>
              <Input
                id="deposit-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="254708374149"
                disabled={isSubmitting || isPolling}
              />
            </div>
            <Button size="lg" className="w-full" onClick={handlePayAndReserve} disabled={isSubmitting || isPolling}>
              {isSubmitting ? "Sending STK..." : isPolling ? "Waiting for payment..." : "Pay & Reserve"}
            </Button>
            {statusMessage ? <p className="text-[11px] text-muted-foreground">{statusMessage}</p> : null}
          </div>
        }
      />
      {error ? (
        <Card>
          <CardContent className="py-3 text-xs text-rose-700">{error}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
