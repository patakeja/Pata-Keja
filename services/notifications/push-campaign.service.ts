import type { SupabaseClient } from "@supabase/supabase-js";

import { getDarajaEnvOrThrow } from "@/config/env";
import { AuthService } from "@/services/auth/auth.service";
import { DarajaService } from "@/services/payments/daraja.service";
import { ServiceError } from "@/services/shared/service-error";
import type { Database, Json } from "@/types/database";
import {
  PaymentStatus,
  PushCampaignReachType,
  PushCampaignStatus,
  ServiceErrorCode,
  UserRole,
  type AuthenticatedUser,
  type CreatePushCampaignInput,
  type PushCampaignListingOption,
  type PushCampaignPaymentRecord,
  type PushCampaignPaymentStartResult,
  type PushCampaignQuote,
  type PushCampaignRecord
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type CampaignRow = Database["public"]["Tables"]["push_campaigns"]["Row"];
type CampaignPaymentRow = Database["public"]["Tables"]["push_campaign_payments"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

type CampaignListingRow = CampaignRow & {
  listing: (Pick<ListingRow, "id" | "title"> & {
    county: { name: string } | null;
    town: { name: string } | null;
    area: { name: string } | null;
  }) | null;
};

type ListingOptionRow = Pick<ListingRow, "id" | "title" | "landlord_id"> & {
  county: { name: string } | null;
  town: { name: string } | null;
  area: { name: string } | null;
};

type CampaignPaymentWithCampaignRow = CampaignPaymentRow & {
  campaign: CampaignRow | null;
};

export class PushCampaignService {
  private readonly authService: AuthService;
  private readonly darajaService: DarajaService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
    this.darajaService = new DarajaService();
  }

  async getCampaignListingOptions(): Promise<PushCampaignListingOption[]> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    let query = client
      .from("listings")
      .select(
        `
          id,
          title,
          landlord_id,
          county:counties!listings_county_id_fkey(name),
          town:towns!listings_town_id_fkey(name),
          area:areas!listings_area_id_fkey(name)
        `
      )
      .order("created_at", { ascending: false });

    if (actor.role === UserRole.LANDLORD) {
      query = query.eq("landlord_id", actor.id);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load campaign listing options.", error);
    }

    return (data ?? []).map((row) => this.mapListingOption(row as ListingOptionRow));
  }

  async getCampaignQuote(
    listingId: string,
    reachType: PushCampaignReachType,
    frequencyPerWeek: number,
    durationDays: number
  ): Promise<PushCampaignQuote> {
    const client = this.clientFactory();
    const { data, error } = await client.rpc("calculate_push_campaign_quote", {
      p_listing_id: listingId,
      p_reach_type: reachType,
      p_frequency_per_week: Math.trunc(frequencyPerWeek),
      p_duration_days: Math.trunc(durationDays)
    });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to calculate the campaign price.", error);
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "The campaign quote did not return any pricing data.");
    }

    return {
      audienceSize: this.toNumber(row.audience_size),
      estimatedImpressions: this.toNumber(row.estimated_impressions),
      cpm: this.toNumber(row.cpm),
      priceTotal: this.toNumber(row.price_total),
      reachLabel: row.reach_label ?? ""
    };
  }

  async createCampaign(input: CreatePushCampaignInput): Promise<PushCampaignRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const quote = await this.getCampaignQuote(
      input.listingId,
      input.reachType,
      input.frequencyPerWeek,
      input.durationDays
    );
    const listing = await this.requireListingForCampaign(client, input.listingId, actor);
    const { data, error } = await client
      .from("push_campaigns")
      .insert({
        listing_id: listing.id,
        landlord_id: listing.landlord_id,
        reach_type: input.reachType,
        frequency_per_week: Math.trunc(input.frequencyPerWeek),
        duration_days: Math.trunc(input.durationDays),
        price_total: quote.priceTotal,
        audience_size: quote.audienceSize,
        status: PushCampaignStatus.PAUSED,
        payment_status: PaymentStatus.PENDING
      })
      .select(this.campaignSelect())
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the push campaign.", error);
    }

    return this.mapCampaign(data as unknown as CampaignListingRow);
  }

  async getMyCampaigns(): Promise<PushCampaignRecord[]> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    let query = client
      .from("push_campaigns")
      .select(this.campaignSelect())
      .order("created_at", { ascending: false });

    if (actor.role === UserRole.LANDLORD) {
      query = query.eq("landlord_id", actor.id);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load push campaigns.", error);
    }

    return (data ?? []).map((row) => this.mapCampaign(row as unknown as CampaignListingRow));
  }

  async updateCampaignStatus(campaignId: string, status: PushCampaignStatus): Promise<PushCampaignRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const campaign = await this.requireCampaign(client, campaignId, actor);

    if (status === PushCampaignStatus.ACTIVE && campaign.payment_status !== PaymentStatus.COMPLETED) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Campaigns can only go live after payment succeeds.");
    }

    const updatePayload: Database["public"]["Tables"]["push_campaigns"]["Update"] = {
      status
    };

    if (status === PushCampaignStatus.ACTIVE && !campaign.starts_at) {
      const nowIso = new Date().toISOString();
      updatePayload.starts_at = nowIso;
      updatePayload.activated_at = campaign.activated_at ?? nowIso;
      updatePayload.ends_at = campaign.ends_at ?? this.buildCampaignEndDate(nowIso, campaign.duration_days);
    }

    const { data, error } = await client
      .from("push_campaigns")
      .update(updatePayload)
      .eq("id", campaign.id)
      .select(this.campaignSelect())
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to update the push campaign status.", error);
    }

    return this.mapCampaign(data as unknown as CampaignListingRow);
  }

  async getCampaignPaymentById(paymentId: string): Promise<PushCampaignPaymentRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const payment = await this.getCampaignPayment(client, paymentId);

    if (actor.role !== UserRole.ADMIN && payment.user_id !== actor.id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this campaign payment.");
    }

    return this.mapCampaignPayment(payment);
  }

  async startCampaignPaymentForActor(
    campaignId: string,
    actor: AuthenticatedUser,
    phone: string
  ): Promise<PushCampaignPaymentStartResult> {
    const client = this.clientFactory();
    const campaign = await this.requireCampaign(client, campaignId, actor);

    if (campaign.status === PushCampaignStatus.COMPLETED) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This campaign has already completed.");
    }

    if (this.toNumber(campaign.price_total) <= 0) {
      const activatedCampaign = await this.activateCampaign(client, campaign, new Date().toISOString());

      return {
        campaign: activatedCampaign,
        payment: {
          id: `free-${campaign.id}`,
          campaignId: campaign.id,
          userId: actor.id,
          amount: 0,
          status: PaymentStatus.COMPLETED,
          phone: null,
          mpesaReceipt: null,
          checkoutRequestId: null,
          merchantRequestId: null,
          providerResultCode: 0,
          providerResultDesc: "Free campaign activated.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        customerMessage: "This campaign is free to launch and is now active."
      };
    }

    const existingOpenPayment = await this.getOpenCampaignPayment(client, campaign.id);

    if (existingOpenPayment && existingOpenPayment.status === PaymentStatus.COMPLETED) {
      const activatedCampaign = await this.activateCampaign(client, campaign, existingOpenPayment.created_at);

      return {
        campaign: activatedCampaign,
        payment: this.mapCampaignPayment(existingOpenPayment),
        customerMessage: "This campaign has already been paid for and is active."
      };
    }

    if (
      existingOpenPayment &&
      existingOpenPayment.status === PaymentStatus.PENDING &&
      existingOpenPayment.checkout_request_id
    ) {
      return {
        campaign: this.mapCampaign(campaign),
        payment: this.mapCampaignPayment(existingOpenPayment),
        customerMessage: "A payment request is already pending on your phone."
      };
    }

    const payment =
      existingOpenPayment ??
      (await this.createPendingCampaignPayment(client, campaign, actor.id));
    const callbackUrl = getDarajaEnvOrThrow().campaignCallbackUrl;
    const stkResponse = await this.darajaService.createStkPush({
      phone,
      amount: this.toNumber(payment.amount),
      accountReference: `PKC-${campaign.id.slice(0, 8)}`,
      transactionDesc: `Pata Keja campaign for ${campaign.listing?.title ?? "listing"}`,
      callbackUrl
    });
    const { data: updatedPayment, error } = await client
      .from("push_campaign_payments")
      .update({
        phone: this.darajaService.normalizePhoneNumber(phone),
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        provider_result_desc: stkResponse.ResponseDescription,
        provider_response: {
          MerchantRequestID: stkResponse.MerchantRequestID,
          CheckoutRequestID: stkResponse.CheckoutRequestID,
          ResponseCode: stkResponse.ResponseCode,
          ResponseDescription: stkResponse.ResponseDescription,
          CustomerMessage: stkResponse.CustomerMessage
        } as Json
      })
      .eq("id", payment.id)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to attach the campaign payment request.", error);
    }

    return {
      campaign: this.mapCampaign(campaign),
      payment: this.mapCampaignPayment(updatedPayment),
      customerMessage: stkResponse.CustomerMessage
    };
  }

  async handleCampaignPaymentCallback(payload: unknown) {
    const client = this.clientFactory();
    const callback = this.extractDarajaCallback(payload);
    const payment = await this.getCampaignPaymentByProviderRequestIds(
      client,
      callback.checkoutRequestId,
      callback.merchantRequestId
    );

    if (!payment || !payment.campaign) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "Unable to match the campaign payment callback.");
    }

    if (callback.resultCode === 0) {
      const { data: updatedPayment, error } = await client
        .from("push_campaign_payments")
        .update({
          status: PaymentStatus.COMPLETED,
          amount: typeof callback.amount === "number" ? this.roundMoney(callback.amount) : payment.amount,
          phone: callback.phone ?? payment.phone,
          mpesa_receipt: callback.mpesaReceipt ?? payment.mpesa_receipt,
          provider_result_code: callback.resultCode,
          provider_result_desc: callback.resultDesc,
          provider_response: payload as Json
        })
        .eq("id", payment.id)
        .select("*")
        .single();

      if (error) {
        throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark the campaign payment as complete.", error);
      }

      const activatedCampaign = await this.activateCampaign(client, payment.campaign, updatedPayment.updated_at);

      return {
        campaign: activatedCampaign,
        payment: this.mapCampaignPayment(updatedPayment)
      };
    }

    const { data: failedPayment, error } = await client
      .from("push_campaign_payments")
      .update({
        status: PaymentStatus.FAILED,
        phone: callback.phone ?? payment.phone,
        provider_result_code: callback.resultCode,
        provider_result_desc: callback.resultDesc,
        provider_response: payload as Json
      })
      .eq("id", payment.id)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark the campaign payment as failed.", error);
    }

    await client
      .from("push_campaigns")
      .update({
        payment_status: PaymentStatus.FAILED,
        status: PushCampaignStatus.PAUSED
      })
      .eq("id", payment.campaign.id);

    return {
      campaign: this.mapCampaign(payment.campaign),
      payment: this.mapCampaignPayment(failedPayment)
    };
  }

  private async requireListingForCampaign(client: ServiceClient, listingId: string, actor: AuthenticatedUser) {
    const { data, error } = await client.from("listings").select("id, landlord_id").eq("id", listingId).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the selected listing.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The selected listing does not exist.");
    }

    if (actor.role !== UserRole.ADMIN && data.landlord_id !== actor.id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to promote this listing.");
    }

    return data;
  }

  private async requireCampaign(client: ServiceClient, campaignId: string, actor: Pick<AuthenticatedUser, "id" | "role">) {
    const { data, error } = await client
      .from("push_campaigns")
      .select(this.campaignSelect())
      .eq("id", campaignId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the push campaign.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The selected push campaign does not exist.");
    }

    const campaign = data as unknown as CampaignListingRow;

    if (actor.role !== UserRole.ADMIN && campaign.landlord_id !== actor.id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this push campaign.");
    }

    return campaign;
  }

  private async getCampaignPayment(client: ServiceClient, paymentId: string) {
    const { data, error } = await client.from("push_campaign_payments").select("*").eq("id", paymentId).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the campaign payment.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested campaign payment does not exist.");
    }

    return data;
  }

  private async getOpenCampaignPayment(client: ServiceClient, campaignId: string) {
    const { data, error } = await client
      .from("push_campaign_payments")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("status", [PaymentStatus.PENDING, PaymentStatus.CONFIRMED, PaymentStatus.COMPLETED])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to inspect campaign payment state.", error);
    }

    return data;
  }

  private async createPendingCampaignPayment(client: ServiceClient, campaign: CampaignListingRow, userId: string) {
    const { data, error } = await client
      .from("push_campaign_payments")
      .insert({
        campaign_id: campaign.id,
        user_id: userId,
        amount: campaign.price_total,
        status: PaymentStatus.PENDING
      })
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create a pending campaign payment.", error);
    }

    return data;
  }

  private async getCampaignPaymentByProviderRequestIds(
    client: ServiceClient,
    checkoutRequestId?: string | null,
    merchantRequestId?: string | null
  ) {
    let query = client
      .from("push_campaign_payments")
      .select(
        `
          *,
          campaign:push_campaigns(*)
        `
      );

    if (checkoutRequestId) {
      query = query.eq("checkout_request_id", checkoutRequestId);
    } else if (merchantRequestId) {
      query = query.eq("merchant_request_id", merchantRequestId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to resolve the campaign payment callback.", error);
    }

    return (data as CampaignPaymentWithCampaignRow | null) ?? null;
  }

  private async activateCampaign(client: ServiceClient, campaign: CampaignListingRow | CampaignRow, activationSeed: string) {
    const nowIso = activationSeed || new Date().toISOString();
    const { data, error } = await client
      .from("push_campaigns")
      .update({
        payment_status: PaymentStatus.COMPLETED,
        status: PushCampaignStatus.ACTIVE,
        starts_at: campaign.starts_at ?? nowIso,
        activated_at: campaign.activated_at ?? nowIso,
        ends_at: campaign.ends_at ?? this.buildCampaignEndDate(nowIso, campaign.duration_days)
      })
      .eq("id", campaign.id)
      .select(this.campaignSelect())
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to activate the push campaign.", error);
    }

    return this.mapCampaign(data as unknown as CampaignListingRow);
  }

  private campaignSelect() {
    return `
      *,
      listing:listings!push_campaigns_listing_id_fkey(
        id,
        title,
        county:counties!listings_county_id_fkey(name),
        town:towns!listings_town_id_fkey(name),
        area:areas!listings_area_id_fkey(name)
      )
    `;
  }

  private mapCampaign(row: CampaignListingRow | CampaignRow): PushCampaignRecord {
    const listing = "listing" in row ? row.listing : null;

    return {
      id: row.id,
      listingId: row.listing_id,
      landlordId: row.landlord_id,
      reachType: row.reach_type,
      frequencyPerWeek: this.toNumber(row.frequency_per_week),
      durationDays: this.toNumber(row.duration_days),
      priceTotal: this.toNumber(row.price_total),
      status: row.status,
      paymentStatus: row.payment_status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      activatedAt: row.activated_at,
      lastDispatchedAt: row.last_dispatched_at,
      audienceSize: this.toNumber(row.audience_size),
      impressionsSent: this.toNumber(row.impressions_sent),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      listingTitle: listing?.title,
      countyName: listing?.county?.name ?? "",
      townName: listing?.town?.name ?? "",
      areaName: listing?.area?.name ?? ""
    };
  }

  private mapListingOption(row: ListingOptionRow): PushCampaignListingOption {
    return {
      id: row.id,
      title: row.title,
      countyName: row.county?.name ?? "",
      townName: row.town?.name ?? "",
      areaName: row.area?.name ?? ""
    };
  }

  private mapCampaignPayment(row: CampaignPaymentRow): PushCampaignPaymentRecord {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      userId: row.user_id,
      amount: this.toNumber(row.amount),
      status: row.status,
      phone: row.phone,
      mpesaReceipt: row.mpesa_receipt,
      checkoutRequestId: row.checkout_request_id,
      merchantRequestId: row.merchant_request_id,
      providerResultCode: row.provider_result_code,
      providerResultDesc: row.provider_result_desc,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private buildCampaignEndDate(startsAt: string, durationDays: number) {
    const start = new Date(startsAt);
    start.setUTCDate(start.getUTCDate() + this.toNumber(durationDays));
    return start.toISOString();
  }

  private extractDarajaCallback(payload: unknown) {
    const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).Body : null;
    const stkCallback =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>).stkCallback : null;
    const callbackRecord =
      typeof stkCallback === "object" && stkCallback !== null ? (stkCallback as Record<string, unknown>) : null;
    const metadata =
      callbackRecord && typeof callbackRecord.CallbackMetadata === "object" && callbackRecord.CallbackMetadata !== null
        ? (callbackRecord.CallbackMetadata as Record<string, unknown>)
        : null;
    const items = Array.isArray(metadata?.Item) ? (metadata.Item as Array<Record<string, unknown>>) : [];
    const itemMap = new Map(
      items
        .filter((item) => typeof item.Name === "string")
        .map((item) => [String(item.Name), item.Value])
    );

    return {
      merchantRequestId: typeof callbackRecord?.MerchantRequestID === "string" ? callbackRecord.MerchantRequestID : null,
      checkoutRequestId: typeof callbackRecord?.CheckoutRequestID === "string" ? callbackRecord.CheckoutRequestID : null,
      resultCode:
        typeof callbackRecord?.ResultCode === "number"
          ? callbackRecord.ResultCode
          : Number(callbackRecord?.ResultCode ?? -1),
      resultDesc:
        typeof callbackRecord?.ResultDesc === "string" ? callbackRecord.ResultDesc : "Campaign payment callback received.",
      amount: this.normalizeOptionalNumber(itemMap.get("Amount")),
      mpesaReceipt: this.normalizeOptionalString(itemMap.get("MpesaReceiptNumber")),
      phone: this.normalizeOptionalString(itemMap.get("PhoneNumber"))
    };
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value === "string") {
      return value.trim() || null;
    }

    if (typeof value === "number") {
      return String(value);
    }

    return null;
  }

  private normalizeOptionalNumber(value: unknown) {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toNumber(value: number | string | null | undefined) {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      return Number(value);
    }

    return 0;
  }
}
