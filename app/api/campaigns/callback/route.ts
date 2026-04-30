import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabaseServerClient";
import { PushCampaignService } from "@/services/notifications/push-campaign.service";
import { isServiceError } from "@/services/shared/service-error";

export const runtime = "nodejs";

const pushCampaignService = new PushCampaignService(getSupabaseServiceRoleClient);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await pushCampaignService.handleCampaignPaymentCallback(payload);

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
      paymentId: result.payment.id,
      campaignId: result.campaign.id
    });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: error.message }, { status: 500 });
    }

    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unable to process campaign callback." }, { status: 500 });
  }
}
