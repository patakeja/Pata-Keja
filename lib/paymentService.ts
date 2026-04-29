import { getSupabaseClient } from "@/lib/supabaseClient";
import { getSession } from "@/lib/auth";
import { PaymentService } from "@/services/payments/payment.service";
import { ServiceError } from "@/services/shared/service-error";
import { ServiceErrorCode, type PaymentStatusPollResult, type StkPaymentStartResult } from "@/types";

export const paymentService = new PaymentService(getSupabaseClient);

type StartStkPaymentInput =
  | {
      listingId: string;
      phone: string;
      bookingId?: never;
    }
  | {
      bookingId: string;
      phone: string;
      listingId?: never;
    };

async function createAuthorizedHeaders() {
  const session = await getSession();

  if (!session?.access_token) {
    throw new ServiceError(ServiceErrorCode.UNAUTHENTICATED, "You must be signed in to start a payment.");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json"
  };
}

function getApiErrorMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallbackMessage;
}

export async function startStkPayment(input: StartStkPaymentInput): Promise<StkPaymentStartResult> {
  const headers = await createAuthorizedHeaders();
  const response = await fetch("/api/payments/stk", {
    method: "POST",
    headers,
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as StkPaymentStartResult | { message?: string };

  if (!response.ok) {
    throw new ServiceError(
      ServiceErrorCode.DATABASE_ERROR,
      getApiErrorMessage(payload, "Unable to start the M-Pesa payment.")
    );
  }

  return payload as StkPaymentStartResult;
}

export async function getStkPaymentStatus(paymentId: string): Promise<PaymentStatusPollResult> {
  const headers = await createAuthorizedHeaders();
  const response = await fetch(`/api/payments/stk?paymentId=${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers
  });
  const payload = (await response.json()) as PaymentStatusPollResult | { message?: string };

  if (!response.ok) {
    throw new ServiceError(
      ServiceErrorCode.DATABASE_ERROR,
      getApiErrorMessage(payload, "Unable to check the current payment status.")
    );
  }

  return payload as PaymentStatusPollResult;
}
