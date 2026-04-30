import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { getSupabaseServiceRoleClient } from "@/lib/supabaseServerClient";
import { PushCampaignService } from "@/services/notifications/push-campaign.service";
import { AuthService } from "@/services/auth/auth.service";
import { ServiceError, isServiceError } from "@/services/shared/service-error";
import { ServiceErrorCode } from "@/types";

export const runtime = "nodejs";

const authService = new AuthService(getSupabaseClient);
const pushCampaignService = new PushCampaignService(getSupabaseServiceRoleClient);

type StartCampaignPaymentPayload = {
  campaignId?: string;
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

  return NextResponse.json({ message: "An unexpected campaign payment error occurred." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthorizedUser(request);
    const body = (await request.json()) as StartCampaignPaymentPayload;
    const campaignId = body.campaignId?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";

    if (!campaignId) {
      return NextResponse.json({ message: "campaignId is required." }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ message: "A phone number is required." }, { status: 400 });
    }

    const result = await pushCampaignService.startCampaignPaymentForActor(campaignId, actor, phone);

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}
