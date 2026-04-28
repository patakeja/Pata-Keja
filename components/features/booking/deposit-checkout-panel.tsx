"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PrebookPanel } from "@/components/features/booking/prebook-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildRestrictedActionRedirect, getCurrentUser } from "@/lib/auth";
import { paymentService } from "@/lib/paymentService";
import { RestrictedAction } from "@/types";
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

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          router.replace(buildRestrictedActionRedirect(RestrictedAction.BOOK, `/deposit/${listingId}`));
          return;
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

  async function handlePayAndReserve() {
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await getCurrentUser();

      if (!user) {
        router.push(buildRestrictedActionRedirect(RestrictedAction.BOOK, `/deposit/${listingId}`));
        return;
      }

      if (!user.phone) {
        throw new Error("Add a phone number to your profile before starting an M-Pesa payment.");
      }

      const reservation = await paymentService.createDepositPayment(listingId, user.id);
      const mpesaResponse = await paymentService.initiateMpesaPayment(reservation.payment.amount, user.phone);

      if (!mpesaResponse.success) {
        throw new Error("The mock M-Pesa flow did not return a success response.");
      }

      await paymentService.confirmDepositPayment(reservation.payment.id);
      router.push("/user/bookings?payment=deposit-confirmed");
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
          <Button size="lg" className="w-full" onClick={handlePayAndReserve} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Pay & Reserve"}
          </Button>
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
