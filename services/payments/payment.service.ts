import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_LANDLORD_COMMISSION_PERCENTAGE } from "@/config/app";
import {
  DEFAULT_BOOKING_CAPACITY_MULTIPLIER,
  DEFAULT_REFUND_PERCENTAGE,
  MAX_BOOKING_CAPACITY_MULTIPLIER,
  MAX_REFUND_PERCENTAGE,
  MIN_BOOKING_CAPACITY_MULTIPLIER,
  MIN_REFUND_PERCENTAGE
} from "@/config/finance";
import { isDarajaConfigured } from "@/config/env";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { AuthService } from "@/services/auth/auth.service";
import { BookingService } from "@/services/bookings/booking.service";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import {
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  ServiceErrorCode,
  UserRole,
  type AuthenticatedUser,
  type DarajaStkPushResponse,
  type DepositCheckout,
  type DepositPaymentBundle,
  type FinanceSettings,
  type MpesaInitiationResult,
  type PaymentConfirmationActor,
  type PaymentRecord,
  type PaymentStatusPollResult,
  type RentCheckout
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type FinanceSettingsRow = Database["public"]["Tables"]["finance_settings"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type LocationNameRow = { name: string } | null;
type CheckoutListingRow = Pick<
  ListingRow,
  "id" | "title" | "price" | "deposit_amount" | "hold_duration_hours" | "listing_type" | "landlord_id" | "is_active"
> & {
  county: LocationNameRow;
  town: LocationNameRow;
  area: LocationNameRow;
};
type BookingWithListingAndPaymentsRow = BookingRow & {
  payments: PaymentRow[] | null;
  listing: CheckoutListingRow | null;
};
type PaymentForActionRow = PaymentRow & {
  booking: (BookingRow & {
    listing: CheckoutListingRow | null;
  }) | null;
};

export class PaymentService {
  private readonly authService: AuthService;
  private readonly bookingService: BookingService;

  constructor(private readonly clientFactory?: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
    this.bookingService = new BookingService(() => this.resolveClient());
  }

  getPrimaryProvider() {
    return PaymentProvider.DARAJA;
  }

  getSupportedProviders() {
    return [PaymentProvider.DARAJA];
  }

  isEnabled() {
    return isDarajaConfigured();
  }

  async getFinanceSettings(): Promise<FinanceSettings> {
    if (!isSupabaseConfigured()) {
      return this.getDefaultFinanceSettings();
    }

    const client = this.resolveClient();
    return this.getFinanceSettingsInternal(client);
  }

  async updateFinanceSettings(refundPercentage: number, bookingCapacityMultiplier?: number): Promise<FinanceSettings> {
    const client = this.resolveClient();
    const actor = await this.authService.requireRole([UserRole.ADMIN], client);
    const normalizedRefundPercentage = this.normalizeRefundPercentage(refundPercentage);
    const normalizedBookingCapacityMultiplier = this.normalizeBookingCapacityMultiplier(bookingCapacityMultiplier);

    const { data, error } = await client
      .from("finance_settings")
      .upsert(
        {
          id: 1,
          refund_percentage: normalizedRefundPercentage,
          booking_capacity_multiplier: normalizedBookingCapacityMultiplier,
          updated_by: actor.id
        },
        {
          onConflict: "id"
        }
      )
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to update finance settings.", error);
    }

    return this.mapFinanceSettings(data);
  }

  async getDepositCheckout(listingId: string): Promise<DepositCheckout> {
    const client = this.resolveClient();
    const listing = await this.getListingCheckoutById(client, listingId);
    const financeSettings = await this.getFinanceSettingsInternal(client);

    if (!listing.is_active) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This listing is not accepting new bookings.");
    }

    return {
      listingId: listing.id,
      title: listing.title,
      areaLabel: this.formatAreaLabel(listing.area?.name ?? "", listing.town?.name ?? "", listing.county?.name ?? ""),
      priceAmount: this.toNumber(listing.price),
      priceLabel: this.formatPriceLabel(this.toNumber(listing.price), listing.listing_type),
      depositAmount: this.toNumber(listing.deposit_amount),
      holdDurationHours: this.toNumber(listing.hold_duration_hours),
      refundPercentage: financeSettings.refundPercentage
    };
  }

  async createDepositPayment(listingId: string, userId?: string): Promise<DepositPaymentBundle> {
    const client = this.resolveClient();
    const actor = await this.authService.requireRole([UserRole.TENANT, UserRole.LANDLORD, UserRole.ADMIN], client);
    return this.createDepositPaymentForActor(listingId, actor, userId, client);
  }

  async createDepositPaymentForActor(
    listingId: string,
    actor: AuthenticatedUser,
    userId?: string,
    clientOverride?: ServiceClient
  ): Promise<DepositPaymentBundle> {
    const client = clientOverride ?? this.resolveClient();
    const paymentUserId = this.resolveActorUserId(actor.id, userId);
    const activeBooking = await this.getActiveBookingForUserListing(client, listingId, paymentUserId);
    let existingBooking = activeBooking;

    if (existingBooking && this.hasExpired(existingBooking.expires_at)) {
      await this.markBookingExpired(client, existingBooking.id);
      existingBooking = null;
    }

    if (existingBooking) {
      const existingDepositPayment = await this.getPaymentByBookingAndType(client, existingBooking.id, PaymentType.DEPOSIT);

      if (existingDepositPayment) {
        if (existingDepositPayment.status === PaymentStatus.PARTIALLY_REFUNDED) {
          throw new ServiceError(
            ServiceErrorCode.VALIDATION_ERROR,
            "The existing deposit for this booking has already been refunded."
          );
        }

        if (this.isSuccessfulPaymentStatus(existingDepositPayment.status)) {
          return {
            booking: this.mapBookingRecord(existingBooking),
            payment: this.mapPaymentRecord(existingDepositPayment)
          };
        }

        return {
          booking: this.mapBookingRecord(existingBooking),
          payment: this.mapPaymentRecord(existingDepositPayment)
        };
      }
    }

    const booking = existingBooking
      ? this.mapBookingRecord(existingBooking)
      : await this.bookingService.createBookingForActor(listingId, actor, paymentUserId, client);
    const { data, error } = await client
      .from("payments")
      .insert({
        booking_id: booking.id,
        user_id: paymentUserId,
        amount: booking.depositAmount,
        payment_type: PaymentType.DEPOSIT,
        method: PaymentMethod.PLATFORM,
        status: PaymentStatus.PENDING,
        commission_amount: 0,
        refund_amount: 0
      })
      .select("*")
      .single();

    if (error) {
      if (!existingBooking) {
        await this.rollbackFreshBooking(client, booking.id);
      }

      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the deposit payment.", error);
    }

    return {
      booking,
      payment: this.mapPaymentRecord(data)
    };
  }

  async confirmDepositPayment(paymentId: string): Promise<PaymentRecord> {
    const client = this.resolveClient();
    const actor = await this.authService.requireCurrentUser(client);
    const payment = await this.getPaymentForAction(client, paymentId);

    if (!payment.booking || !payment.booking.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Payment booking relation is missing.");
    }

    if (actor.role !== UserRole.ADMIN && actor.id !== payment.user_id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to confirm this deposit payment.");
    }

    if (payment.payment_type !== PaymentType.DEPOSIT) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Only deposit payments can be confirmed here.");
    }

    if (payment.status === PaymentStatus.PARTIALLY_REFUNDED) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Refunded deposit payments cannot be confirmed.");
    }

    if (this.isSuccessfulPaymentStatus(payment.status)) {
      if (!payment.booking.deposit_paid) {
        await this.markBookingDepositPaid(client, payment.booking.id);
      }

      return this.mapPaymentRecord(payment);
    }

    if (payment.booking.status !== BookingStatus.ACTIVE || this.hasExpired(payment.booking.expires_at)) {
      await this.markBookingExpired(client, payment.booking.id);
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This booking has expired.");
    }

    const { data, error } = await client
      .from("payments")
      .update({
        status: PaymentStatus.COMPLETED
      })
      .eq("id", payment.id)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to confirm the deposit payment.", error);
    }

    await this.markBookingDepositPaid(client, payment.booking.id);

    return this.mapPaymentRecord(data);
  }

  async createRentPayment(bookingId: string, method: PaymentMethod): Promise<PaymentRecord> {
    const client = this.resolveClient();
    const actor = await this.authService.requireCurrentUser(client);
    return this.createRentPaymentForActor(bookingId, method, actor, client);
  }

  async createRentPaymentForActor(
    bookingId: string,
    method: PaymentMethod,
    actor: AuthenticatedUser,
    clientOverride?: ServiceClient
  ): Promise<PaymentRecord> {
    const client = clientOverride ?? this.resolveClient();
    this.assertPaymentMethod(method);

    const booking = await this.getBookingWithListingAndPayments(client, bookingId);

    if (!booking.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking listing relation is missing.");
    }

    if (actor.role !== UserRole.ADMIN && actor.id !== booking.user_id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You cannot create a rent payment for this booking.");
    }

    if (booking.status !== BookingStatus.ACTIVE) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Only active bookings can accept rent payments.");
    }

    if (this.hasExpired(booking.expires_at)) {
      await this.markBookingExpired(client, booking.id);
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This booking has expired.");
    }

    const depositPayment = this.findLatestPaymentByType(booking.payments, PaymentType.DEPOSIT);

    if (!depositPayment || !this.isSuccessfulPaymentStatus(depositPayment.status)) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "Deposit payment must be confirmed before rent payment can start."
      );
    }

    const existingRentPayment = this.findLatestPaymentByType(booking.payments, PaymentType.RENT);

    if (existingRentPayment) {
      if (this.isSuccessfulPaymentStatus(existingRentPayment.status)) {
        throw new ServiceError(
          ServiceErrorCode.VALIDATION_ERROR,
          "Rent payment has already been confirmed for this booking."
        );
      }

      return this.mapPaymentRecord(existingRentPayment);
    }

    const remainingAmount = this.roundMoney(
      Math.max(0, this.toNumber(booking.listing.price) - this.toNumber(booking.deposit_amount))
    );

    if (remainingAmount <= 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "There is no remaining rent balance for this booking.");
    }

    const { data, error } = await client
      .from("payments")
      .insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: remainingAmount,
        payment_type: PaymentType.RENT,
        method,
        status: PaymentStatus.PENDING,
        commission_amount: 0,
        refund_amount: 0
      })
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the rent payment.", error);
    }

    return this.mapPaymentRecord(data);
  }

  async getRentCheckout(bookingId: string): Promise<RentCheckout> {
    const client = this.resolveClient();
    const actor = await this.authService.requireCurrentUser(client);
    const booking = await this.getBookingWithListingAndPayments(client, bookingId);

    if (!booking.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking listing relation is missing.");
    }

    const actorCanAccess =
      actor.role === UserRole.ADMIN ||
      actor.id === booking.user_id ||
      (actor.role === UserRole.LANDLORD && actor.id === booking.listing.landlord_id);

    if (!actorCanAccess) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this booking's payment details.");
    }

    const summary = this.buildPaymentSummary(booking, booking.listing, booking.payments);

    return {
      bookingId: booking.id,
      listingId: booking.listing.id,
      title: booking.listing.title,
      areaLabel: this.formatAreaLabel(
        booking.listing.area?.name ?? "",
        booking.listing.town?.name ?? "",
        booking.listing.county?.name ?? ""
      ),
      listingPrice: this.toNumber(booking.listing.price),
      depositAmount: this.toNumber(booking.deposit_amount),
      depositPaidAmount: summary.depositPaidAmount,
      refundAmount: summary.refundAmount,
      remainingRentAmount: summary.remainingRentAmount,
      depositPaymentStatus: summary.depositPaymentStatus,
      rentPaymentStatus: summary.rentPaymentStatus,
      expiresAt: booking.expires_at,
      bookingStatus: booking.status
    };
  }

  async processExpiredBookingRefund(bookingId: string): Promise<PaymentRecord> {
    const client = this.resolveClient();
    await this.authService.requireRole([UserRole.ADMIN], client);
    const booking = await this.getBookingWithListingAndPayments(client, bookingId);

    if (!booking.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking listing relation is missing.");
    }

    if (booking.status === BookingStatus.ACTIVE && this.hasExpired(booking.expires_at)) {
      await this.markBookingExpired(client, booking.id);
      booking.status = BookingStatus.EXPIRED;
    }

    if (booking.status !== BookingStatus.EXPIRED) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Only expired bookings can be refunded.");
    }

    const depositPayment = this.findLatestPaymentByType(booking.payments, PaymentType.DEPOSIT);

    if (!depositPayment) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "No deposit payment was found for this booking.");
    }

    if (depositPayment.status === PaymentStatus.PARTIALLY_REFUNDED) {
      return this.mapPaymentRecord(depositPayment);
    }

    if (!this.isSuccessfulPaymentStatus(depositPayment.status)) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "Only confirmed deposit payments can be processed for refund."
      );
    }

    const financeSettings = await this.getFinanceSettingsInternal(client);
    const refundAmount = this.roundMoney(this.toNumber(depositPayment.amount) * financeSettings.refundPercentage);

    const { data, error } = await client
      .from("payments")
      .update({
        status: PaymentStatus.PARTIALLY_REFUNDED,
        refund_amount: refundAmount
      })
      .eq("id", depositPayment.id)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to process the expired booking refund.", error);
    }

    return this.mapPaymentRecord(data);
  }

  async initiateMpesaPayment(amount: number, phone: string): Promise<MpesaInitiationResult> {
    const normalizedAmount = this.roundMoney(amount);
    const normalizedPhone = phone.trim();

    if (normalizedAmount <= 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Payment amount must be greater than zero.");
    }

    if (!normalizedPhone) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "A phone number is required to initiate M-Pesa.");
    }

    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      provider: PaymentProvider.DARAJA,
      success: true,
      checkoutRequestId: `mock-checkout-${token}`,
      merchantRequestId: `mock-merchant-${token}`,
      customerMessage: "Mock M-Pesa request initiated successfully.",
      amount: normalizedAmount,
      phone: normalizedPhone
    };
  }

  async confirmRentPayment(paymentId: string, actor: PaymentConfirmationActor): Promise<PaymentRecord> {
    const client = this.resolveClient();
    const requester = await this.authService.requireRole([UserRole.ADMIN, UserRole.LANDLORD], client);

    if (requester.role !== actor) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "Payment confirmation actor does not match your account role.");
    }

    const payment = await this.getPaymentForAction(client, paymentId);

    if (!payment.booking || !payment.booking.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Payment booking relation is missing.");
    }

    if (payment.payment_type !== PaymentType.RENT) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Only rent payments can complete a booking.");
    }

    if (requester.role === UserRole.LANDLORD && payment.booking.listing.landlord_id !== requester.id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to confirm this rent payment.");
    }

    if (!this.isSuccessfulPaymentStatus(payment.status) && payment.booking.status === BookingStatus.EXPIRED) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Expired bookings cannot be completed.");
    }

    if (!this.isSuccessfulPaymentStatus(payment.status) && this.hasExpired(payment.booking.expires_at)) {
      await this.markBookingExpired(client, payment.booking.id);
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This booking has expired.");
    }

    if (this.isSuccessfulPaymentStatus(payment.status)) {
      await this.ensureBookingCompleted(client, payment.booking.id, payment.booking.status);
      return this.mapPaymentRecord(payment);
    }

    const commissionPercentage = await this.getLandlordCommissionPercentage(client, payment.booking.listing.landlord_id);
    const commissionAmount = this.calculateCommissionAmount(this.toNumber(payment.amount), commissionPercentage);

    const { data: updatedPayment, error: paymentUpdateError } = await client
      .from("payments")
      .update({
        status: PaymentStatus.COMPLETED,
        commission_amount: commissionAmount
      })
      .eq("id", payment.id)
      .select("*")
      .single();

    if (paymentUpdateError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to confirm the rent payment.", paymentUpdateError);
    }

    await this.ensureBookingCompleted(client, payment.booking.id, payment.booking.status);

    return this.mapPaymentRecord(updatedPayment);
  }

  async attachStkRequestToPayment(
    paymentId: string,
    phone: string,
    stkResponse: DarajaStkPushResponse
  ): Promise<PaymentRecord> {
    const client = this.resolveClient();
    const { data, error } = await client
      .from("payments")
      .update({
        phone,
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        provider_result_desc: stkResponse.ResponseDescription,
        provider_response: stkResponse as unknown as Database["public"]["Tables"]["payments"]["Update"]["provider_response"],
        status: PaymentStatus.PENDING
      })
      .eq("id", paymentId)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to attach the STK request to the payment.", error);
    }

    return this.mapPaymentRecord(data);
  }

  async markPaymentFailed(
    paymentId: string,
    resultDescription: string,
    metadata?: {
      resultCode?: number | null;
      phone?: string | null;
      providerResponse?: unknown;
      checkoutRequestId?: string | null;
      merchantRequestId?: string | null;
    }
  ): Promise<PaymentRecord> {
    const client = this.resolveClient();
    const { data, error } = await client
      .from("payments")
      .update({
        status: PaymentStatus.FAILED,
        provider_result_code: metadata?.resultCode ?? null,
        provider_result_desc: resultDescription,
        phone: metadata?.phone ?? null,
        checkout_request_id: metadata?.checkoutRequestId ?? null,
        merchant_request_id: metadata?.merchantRequestId ?? null,
        provider_response:
          (metadata?.providerResponse as Database["public"]["Tables"]["payments"]["Update"]["provider_response"]) ??
          {}
      })
      .eq("id", paymentId)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark the payment as failed.", error);
    }

    return this.mapPaymentRecord(data);
  }

  async getPaymentStatusForActor(paymentId: string, actor: AuthenticatedUser): Promise<PaymentStatusPollResult> {
    const client = this.resolveClient();
    const payment = await this.getPaymentForAction(client, paymentId);

    if (!payment.booking) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Payment booking relation is missing.");
    }

    const canAccess =
      actor.role === UserRole.ADMIN ||
      actor.id === payment.user_id ||
      (actor.role === UserRole.LANDLORD && payment.booking.listing?.landlord_id === actor.id);

    if (!canAccess) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this payment.");
    }

    return {
      payment: this.mapPaymentRecord(payment),
      bookingId: payment.booking.id,
      depositPaid: payment.booking.deposit_paid
    };
  }

  async handleDarajaCallback(payload: unknown): Promise<PaymentStatusPollResult | null> {
    const client = this.resolveClient();
    const callback = this.extractDarajaCallback(payload);

    if (!callback.checkoutRequestId && !callback.merchantRequestId) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Callback is missing the Daraja request identifiers.");
    }

    const payment = await this.getPaymentByProviderRequestIds(client, callback.checkoutRequestId, callback.merchantRequestId);

    if (!payment || !payment.booking || !payment.booking.listing) {
      return null;
    }

    if (callback.resultCode === 0) {
      const commissionAmount =
        payment.payment_type === PaymentType.RENT
          ? this.calculateCommissionAmount(
              this.toNumber(callback.amount ?? payment.amount),
              await this.getLandlordCommissionPercentage(client, payment.booking.listing.landlord_id)
            )
          : this.toNumber(payment.commission_amount);

      const { data: updatedPayment, error: paymentUpdateError } = await client
        .from("payments")
        .update({
          status: PaymentStatus.COMPLETED,
          amount: typeof callback.amount === "number" ? this.roundMoney(callback.amount) : payment.amount,
          phone: callback.phone ?? payment.phone,
          mpesa_receipt: callback.mpesaReceipt ?? payment.mpesa_receipt,
          provider_result_code: callback.resultCode,
          provider_result_desc: callback.resultDesc,
          provider_response:
            payload as Database["public"]["Tables"]["payments"]["Update"]["provider_response"],
          commission_amount: commissionAmount
        })
        .eq("id", payment.id)
        .select("*")
        .single();

      if (paymentUpdateError) {
        throw new ServiceError(
          ServiceErrorCode.DATABASE_ERROR,
          "Unable to mark the Daraja payment as completed.",
          paymentUpdateError
        );
      }

      if (payment.payment_type === PaymentType.DEPOSIT) {
        await this.markBookingDepositPaid(client, payment.booking.id);
      }

      if (payment.payment_type === PaymentType.RENT) {
        await this.ensureBookingCompleted(client, payment.booking.id, payment.booking.status);
      }

      const refreshedPayment = await this.getPaymentForAction(client, updatedPayment.id);

      if (!refreshedPayment.booking) {
        throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Updated payment booking relation is missing.");
      }

      return {
        payment: this.mapPaymentRecord(updatedPayment),
        bookingId: refreshedPayment.booking.id,
        depositPaid: refreshedPayment.booking.deposit_paid
      };
    }

    const failedPayment = await this.markPaymentFailed(payment.id, callback.resultDesc, {
      resultCode: callback.resultCode,
      phone: callback.phone ?? payment.phone,
      providerResponse: payload,
      checkoutRequestId: callback.checkoutRequestId ?? payment.checkout_request_id,
      merchantRequestId: callback.merchantRequestId ?? payment.merchant_request_id
    });
    const refreshedPayment = await this.getPaymentForAction(client, failedPayment.id);

    if (!refreshedPayment.booking) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Updated payment booking relation is missing.");
    }

    return {
      payment: failedPayment,
      bookingId: refreshedPayment.booking.id,
      depositPaid: refreshedPayment.booking.deposit_paid
    };
  }

  private resolveClient() {
    if (!this.clientFactory) {
      throw new ServiceError(ServiceErrorCode.CONFIG_ERROR, "Supabase client factory is not configured.");
    }

    return this.clientFactory();
  }

  private assertPaymentMethod(method: PaymentMethod) {
    if (method !== PaymentMethod.PLATFORM && method !== PaymentMethod.EXTERNAL) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Unsupported payment method.");
    }
  }

  private async getListingCheckoutById(client: ServiceClient, listingId: string): Promise<CheckoutListingRow> {
    const { data, error } = await client
      .from("listings")
      .select(
        `
          id,
          title,
          price,
          deposit_amount,
          hold_duration_hours,
          listing_type,
          landlord_id,
          is_active,
          county:counties!listings_county_id_fkey(name),
          town:towns!listings_town_id_fkey(name),
          area:areas!listings_area_id_fkey(name)
        `
      )
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the deposit checkout details.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested listing does not exist.");
    }

    return data as CheckoutListingRow;
  }

  private async getActiveBookingForUserListing(client: ServiceClient, listingId: string, userId: string) {
    const { data, error } = await client
      .from("bookings")
      .select("*")
      .eq("listing_id", listingId)
      .eq("user_id", userId)
      .eq("status", BookingStatus.ACTIVE)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to inspect existing active bookings.", error);
    }

    return data;
  }

  private async getBookingWithListingAndPayments(
    client: ServiceClient,
    bookingId: string
  ): Promise<BookingWithListingAndPaymentsRow> {
    const { data, error } = await client
      .from("bookings")
      .select(
        `
          *,
          payments:payments(*),
          listing:listings(
            id,
            title,
            price,
            deposit_amount,
            hold_duration_hours,
            listing_type,
            landlord_id,
            is_active,
            county:counties!listings_county_id_fkey(name),
            town:towns!listings_town_id_fkey(name),
            area:areas!listings_area_id_fkey(name)
          )
        `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the booking payment details.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested booking does not exist.");
    }

    return data as BookingWithListingAndPaymentsRow;
  }

  private async getPaymentForAction(client: ServiceClient, paymentId: string): Promise<PaymentForActionRow> {
    const { data, error } = await client
      .from("payments")
      .select(
        `
          *,
          booking:bookings(
            *,
            listing:listings(
              id,
              title,
              price,
              deposit_amount,
              hold_duration_hours,
              listing_type,
              landlord_id,
              is_active,
              county:counties!listings_county_id_fkey(name),
              town:towns!listings_town_id_fkey(name),
              area:areas!listings_area_id_fkey(name)
            )
          )
        `
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the payment details.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested payment does not exist.");
    }

    return data as PaymentForActionRow;
  }

  private async getPaymentByProviderRequestIds(
    client: ServiceClient,
    checkoutRequestId?: string | null,
    merchantRequestId?: string | null
  ): Promise<PaymentForActionRow | null> {
    let query = client.from("payments").select(
      `
        *,
        booking:bookings(
          *,
          listing:listings(
            id,
            title,
            price,
            deposit_amount,
            hold_duration_hours,
            listing_type,
            landlord_id,
            is_active,
            county:counties!listings_county_id_fkey(name),
            town:towns!listings_town_id_fkey(name),
            area:areas!listings_area_id_fkey(name)
          )
        )
      `
    );

    if (checkoutRequestId) {
      query = query.eq("checkout_request_id", checkoutRequestId);
    } else if (merchantRequestId) {
      query = query.eq("merchant_request_id", merchantRequestId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to resolve the Daraja payment callback.", error);
    }

    return (data as PaymentForActionRow | null) ?? null;
  }

  private async getPaymentByBookingAndType(client: ServiceClient, bookingId: string, paymentType: PaymentType) {
    const { data, error } = await client
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("payment_type", paymentType)
      .in("status", [PaymentStatus.PENDING, PaymentStatus.CONFIRMED, PaymentStatus.COMPLETED, PaymentStatus.PARTIALLY_REFUNDED])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to inspect existing payment state.", error);
    }

    return data;
  }

  private async getFinanceSettingsInternal(client: ServiceClient): Promise<FinanceSettings> {
    const { data, error } = await client.from("finance_settings").select("*").eq("id", 1).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load finance settings.", error);
    }

    if (!data) {
      return this.getDefaultFinanceSettings();
    }

    return this.mapFinanceSettings(data);
  }

  private async getLandlordCommissionPercentage(client: ServiceClient, landlordId: string) {
    const { data, error } = await client
      .from("users")
      .select("commission_percentage")
      .eq("id", landlordId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load landlord commission settings.", error);
    }

    if (!data) {
      return DEFAULT_LANDLORD_COMMISSION_PERCENTAGE;
    }

    return this.toNumber(data.commission_percentage);
  }

  private async ensureBookingCompleted(client: ServiceClient, bookingId: string, currentStatus: BookingStatus) {
    if (currentStatus === BookingStatus.COMPLETED) {
      return;
    }

    const { error } = await client
      .from("bookings")
      .update({
        status: BookingStatus.COMPLETED,
        expires_at: null
      })
      .eq("id", bookingId);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark the booking as completed.", error);
    }
  }

  private async markBookingDepositPaid(client: ServiceClient, bookingId: string) {
    const { error } = await client
      .from("bookings")
      .update({
        deposit_paid: true
      })
      .eq("id", bookingId);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark the booking deposit as paid.", error);
    }
  }

  private async markBookingExpired(client: ServiceClient, bookingId: string) {
    const { error } = await client
      .from("bookings")
      .update({
        status: BookingStatus.EXPIRED
      })
      .eq("id", bookingId);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to expire the booking.", error);
    }
  }

  private async rollbackFreshBooking(client: ServiceClient, bookingId: string) {
    await client.from("bookings").delete().eq("id", bookingId);
  }

  private buildPaymentSummary(
    booking: Pick<BookingRow, "status">,
    listing: Pick<ListingRow, "price" | "deposit_amount">,
    payments: PaymentRow[] | null
  ) {
    const depositPayment = this.findLatestPaymentByType(payments, PaymentType.DEPOSIT);
    const rentPayment = this.findLatestPaymentByType(payments, PaymentType.RENT);
    const remainingRentAmount = this.roundMoney(
      Math.max(0, this.toNumber(listing.price) - this.toNumber(listing.deposit_amount))
    );
    const depositPaidAmount =
      depositPayment &&
      [PaymentStatus.CONFIRMED, PaymentStatus.COMPLETED, PaymentStatus.PARTIALLY_REFUNDED].includes(
        depositPayment.status
      )
        ? this.toNumber(depositPayment.amount)
        : 0;

    return {
      depositPaidAmount,
      refundAmount: depositPayment ? this.toNumber(depositPayment.refund_amount) : 0,
      depositPaymentStatus: depositPayment?.status ?? null,
      rentPaymentStatus: rentPayment?.status ?? null,
      remainingRentAmount,
      canPayRent:
        booking.status === BookingStatus.ACTIVE &&
        Boolean(depositPayment && this.isSuccessfulPaymentStatus(depositPayment.status)) &&
        remainingRentAmount > 0 &&
        !Boolean(rentPayment && this.isSuccessfulPaymentStatus(rentPayment.status)) &&
        rentPayment?.status !== PaymentStatus.PENDING
    };
  }

  private findLatestPaymentByType(payments: PaymentRow[] | null, paymentType: PaymentType) {
    return (payments ?? [])
      .filter((payment) => payment.payment_type === paymentType)
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] ?? null;
  }

  private resolveActorUserId(actorId: string, userId?: string) {
    if (userId && userId !== actorId) {
      throw new ServiceError(
        ServiceErrorCode.FORBIDDEN,
        "Payments can only be created for the currently authenticated tenant."
      );
    }

    return userId ?? actorId;
  }

  private normalizeRefundPercentage(refundPercentage: number) {
    if (!Number.isFinite(refundPercentage)) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Refund percentage must be a valid number.");
    }

    if (refundPercentage < MIN_REFUND_PERCENTAGE || refundPercentage > MAX_REFUND_PERCENTAGE) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "Refund percentage must be between 0 and 1."
      );
    }

    return Math.round((refundPercentage + Number.EPSILON) * 10000) / 10000;
  }

  private normalizeBookingCapacityMultiplier(bookingCapacityMultiplier: number | undefined) {
    const candidate =
      typeof bookingCapacityMultiplier === "number"
        ? bookingCapacityMultiplier
        : DEFAULT_BOOKING_CAPACITY_MULTIPLIER;

    if (!Number.isFinite(candidate)) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Booking capacity multiplier must be a valid number.");
    }

    const normalizedValue = Math.trunc(candidate);

    if (
      normalizedValue < MIN_BOOKING_CAPACITY_MULTIPLIER ||
      normalizedValue > MAX_BOOKING_CAPACITY_MULTIPLIER
    ) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        `Booking capacity multiplier must be between ${MIN_BOOKING_CAPACITY_MULTIPLIER} and ${MAX_BOOKING_CAPACITY_MULTIPLIER}.`
      );
    }

    return normalizedValue;
  }

  private getDefaultFinanceSettings(): FinanceSettings {
    const now = new Date().toISOString();

    return {
      refundPercentage: DEFAULT_REFUND_PERCENTAGE,
      bookingCapacityMultiplier: DEFAULT_BOOKING_CAPACITY_MULTIPLIER,
      createdAt: now,
      updatedAt: now,
      updatedBy: null
    };
  }

  private mapFinanceSettings(row: FinanceSettingsRow): FinanceSettings {
    return {
      refundPercentage: this.toNumber(row.refund_percentage),
      bookingCapacityMultiplier: this.toNumber(row.booking_capacity_multiplier),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  private calculateCommissionAmount(amount: number, percentage: number) {
    return this.roundMoney(amount * (percentage / 100));
  }

  private mapBookingRecord(row: BookingRow) {
    return {
      id: row.id,
      userId: row.user_id,
      listingId: row.listing_id,
      status: row.status,
      depositAmount: this.toNumber(row.deposit_amount),
      depositPaid: row.deposit_paid,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapPaymentRecord(row: PaymentRow): PaymentRecord {
    return {
      id: row.id,
      bookingId: row.booking_id,
      userId: row.user_id,
      amount: this.toNumber(row.amount),
      paymentType: row.payment_type,
      method: row.method,
      status: row.status,
      commissionAmount: this.toNumber(row.commission_amount),
      refundAmount: this.toNumber(row.refund_amount),
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

  private formatPriceLabel(price: number, listingType: ListingRow["listing_type"]) {
    const formatter = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    });

    const cadence = listingType === "short_stay" ? "night" : "month";

    return `${formatter.format(price)} / ${cadence}`;
  }

  private formatAreaLabel(areaName: string, townName: string, countyName: string) {
    return [areaName, townName, countyName].filter(Boolean).join(", ");
  }

  private hasExpired(expiresAt: string | null) {
    if (!expiresAt) {
      return false;
    }

    return new Date(expiresAt).getTime() < Date.now();
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private isSuccessfulPaymentStatus(status: PaymentStatus) {
    return status === PaymentStatus.CONFIRMED || status === PaymentStatus.COMPLETED;
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
    const items = Array.isArray(metadata?.Item) ? (metadata?.Item as Array<Record<string, unknown>>) : [];
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
        typeof callbackRecord?.ResultDesc === "string" ? callbackRecord.ResultDesc : "Daraja callback received.",
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
