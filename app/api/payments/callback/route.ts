import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabaseServerClient";
import { PaymentService } from "@/services/payments/payment.service";
import { isServiceError } from "@/services/shared/service-error";

export const runtime = "nodejs";

const paymentService = new PaymentService(getSupabaseServiceRoleClient);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await paymentService.handleDarajaCallback(payload);

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
      paymentId: result?.payment.id ?? null
    });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: error.message }, { status: 500 });
    }

    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unable to process callback." }, { status: 500 });
  }
}
