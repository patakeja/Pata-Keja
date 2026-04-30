import { getDarajaEnvOrThrow } from "@/config/env";
import { ServiceError } from "@/services/shared/service-error";
import { PaymentProvider, ServiceErrorCode, type DarajaStkPushInput, type DarajaStkPushResponse } from "@/types";

type DarajaAccessTokenResponse = {
  access_token?: string;
  expires_in?: string;
};

export class DarajaService {
  getProvider() {
    return PaymentProvider.DARAJA;
  }

  async getAccessToken(): Promise<string> {
    const config = getDarajaEnvOrThrow();
    const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
    const response = await fetch(`${this.getBaseUrl(config.env)}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        `Daraja access token request failed with status ${response.status}.`,
        await this.safeJson(response)
      );
    }

    const payload = (await response.json()) as DarajaAccessTokenResponse;

    if (!payload.access_token) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Daraja did not return an access token.", payload);
    }

    return payload.access_token;
  }

  async createStkPush(input: DarajaStkPushInput): Promise<DarajaStkPushResponse> {
    const config = getDarajaEnvOrThrow();
    const accessToken = await this.getAccessToken();
    const timestamp = this.buildTimestamp();
    const amount = this.normalizeAmount(input.amount);
    const phone = this.normalizePhoneNumber(input.phone);
    const shortcode = config.shortcode;
    const callbackUrl = input.callbackUrl?.trim() || config.callbackUrl;
    const password = Buffer.from(`${shortcode}${config.passkey}${timestamp}`).toString("base64");
    const response = await fetch(`${this.getBaseUrl(config.env)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: input.accountReference.slice(0, 12),
        TransactionDesc: input.transactionDesc.slice(0, 80)
      }),
      cache: "no-store"
    });

    const payload = (await this.safeJson(response)) as Partial<DarajaStkPushResponse> & {
      errorMessage?: string;
    };

    if (!response.ok || payload.ResponseCode !== "0") {
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        payload.errorMessage || payload.ResponseDescription || `Daraja STK push failed with status ${response.status}.`,
        payload
      );
    }

    if (!payload.CheckoutRequestID || !payload.MerchantRequestID || !payload.CustomerMessage || !payload.ResponseDescription) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Daraja STK push response was incomplete.", payload);
    }

    return {
      MerchantRequestID: payload.MerchantRequestID,
      CheckoutRequestID: payload.CheckoutRequestID,
      ResponseCode: payload.ResponseCode ?? "0",
      ResponseDescription: payload.ResponseDescription,
      CustomerMessage: payload.CustomerMessage
    };
  }

  normalizePhoneNumber(phone: string) {
    const digits = phone.replace(/[^\d+]/g, "");

    if (digits.startsWith("+254")) {
      return digits.slice(1);
    }

    if (digits.startsWith("254")) {
      return digits;
    }

    if (digits.startsWith("07") || digits.startsWith("01")) {
      return `254${digits.slice(1)}`;
    }

    throw new ServiceError(
      ServiceErrorCode.VALIDATION_ERROR,
      "Use a Safaricom phone number in 07..., 01..., +254..., or 254... format."
    );
  }

  private getBaseUrl(targetEnv: "sandbox" | "production") {
    return targetEnv === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  }

  private buildTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private normalizeAmount(amount: number) {
    const normalizedAmount = Math.trunc(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Payment amount must be greater than zero.");
    }

    return normalizedAmount;
  }

  private async safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
