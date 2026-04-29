import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { getSupabaseServiceRoleClient } from "@/lib/supabaseServerClient";
import { AuthService } from "@/services/auth/auth.service";
import { DarajaService } from "@/services/payments/daraja.service";
import { PaymentService } from "@/services/payments/payment.service";
import { ServiceError, isServiceError } from "@/services/shared/service-error";
import { PaymentMethod, PaymentStatus, ServiceErrorCode, type PaymentRecord } from "@/types";

export const runtime = "nodejs";

const authService = new AuthService(getSupabaseClient);
const darajaService = new DarajaService();
const paymentService = new PaymentService(getSupabaseServiceRoleClient);

type StartStkPayload = {
  listingId?: string;
  bookingId?: string;
  phone?: string;
};

function getAccessTokenFromRequest(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization") ?? "";
  return authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";
}

async function requireAuthorizedUser(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    throw new ServiceError(ServiceErrorCode.UNAUTHENTICATED, "Missing bearer token.");
  }

  const user = await authService.getCurrentUserFromAccessToken(accessToken);

  if (!user) {
    throw new ServiceError(ServiceErrorCode.UNAUTHENTICATED, "The current session is not valid.");
  }

  return user;
}

function createErrorResponse(error: unknown) {
  if (isServiceError(error)) {
    const statusCode =
      error.code === ServiceErrorCode.UNAUTHENTICATED
        ? 401
        : error.code === ServiceErrorCode.FORBIDDEN
          ? 403
          : error.code === ServiceErrorCode.NOT_FOUND
            ? 404
            : error.code === ServiceErrorCode.VALIDATION_ERROR
              ? 400
              : 500;

    return NextResponse.json({ message: error.message, code: error.code }, { status: statusCode });
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "An unexpected payment error occurred." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  let pendingPaymentId: string | null = null;

  try {
    const actor = await requireAuthorizedUser(request);
    const body = (await request.json()) as StartStkPayload;
    const phone = body.phone?.trim() ?? "";

    if (!phone) {
      return NextResponse.json({ message: "A phone number is required." }, { status: 400 });
    }

    if (!body.listingId && !body.bookingId) {
      return NextResponse.json({ message: "Provide either a listingId or bookingId." }, { status: 400 });
    }

    const normalizedPhone = darajaService.normalizePhoneNumber(phone);
    let payment: PaymentRecord;
    let bookingId = "";
    let depositPaid = false;

    if (body.listingId) {
      const depositBundle = await paymentService.createDepositPaymentForActor(body.listingId, actor, actor.id);
      payment = depositBundle.payment;
      bookingId = depositBundle.booking.id;
      depositPaid = depositBundle.booking.depositPaid;
    } else {
      payment = await paymentService.createRentPaymentForActor(body.bookingId!, PaymentMethod.PLATFORM, actor);
      const initialStatus = await paymentService.getPaymentStatusForActor(payment.id, actor);
      bookingId = initialStatus.bookingId;
      depositPaid = initialStatus.depositPaid;
    }

    pendingPaymentId = payment.id;

    if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.CONFIRMED) {
      const statusResult = await paymentService.getPaymentStatusForActor(payment.id, actor);
      return NextResponse.json(
        {
          ...statusResult,
          customerMessage: "This payment has already been completed."
        },
        { status: 200 }
      );
    }

    const stkResponse = await darajaService.createStkPush({
      phone: normalizedPhone,
      amount: payment.amount,
      accountReference: `PK-${bookingId.slice(0, 8)}`,
      transactionDesc: body.listingId ? "Pata Keja deposit" : "Pata Keja rent"
    });
    const updatedPayment = await paymentService.attachStkRequestToPayment(payment.id, normalizedPhone, stkResponse);

    return NextResponse.json({
      payment: updatedPayment,
      bookingId,
      depositPaid,
      customerMessage: stkResponse.CustomerMessage
    });
  } catch (error) {
    if (pendingPaymentId) {
      await paymentService
        .markPaymentFailed(
          pendingPaymentId,
          error instanceof Error ? error.message : "Unable to start the Daraja STK push."
        )
        .catch(() => undefined);
    }

    return createErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAuthorizedUser(request);
    const paymentId = request.nextUrl.searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json({ message: "paymentId is required." }, { status: 400 });
    }

    const statusResult = await paymentService.getPaymentStatusForActor(paymentId, actor);

    return NextResponse.json(statusResult);
  } catch (error) {
    return createErrorResponse(error);
  }
}
