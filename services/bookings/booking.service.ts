import type { SupabaseClient } from "@supabase/supabase-js";

import { BOOKING_RESERVATION_WINDOW_HOURS } from "@/config/app";
import { PREBOOK_DEPOSIT_RATIO, PREBOOK_REFUND_EXPLANATION } from "@/config/booking";
import { AuthService } from "@/services/auth/auth.service";
import { ChatService } from "@/services/chat/chat.service";
import { ServiceError } from "@/services/shared/service-error";
import { ImageService } from "@/services/storage/image.service";
import type { Database } from "@/types/database";
import {
  BookingStatus,
  PaymentStatus,
  PaymentType,
  ServiceErrorCode,
  UserRole,
  type BookingDetail,
  type BookingInterest,
  type BookingPolicy,
  type BookingPaymentSummary,
  type ListingBooking,
  type ReservationQuote,
  type UserBooking
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ReservationQuoteSource = number | Pick<ListingRow, "price" | "deposit_amount" | "hold_duration_hours">;
type ListingBookingConfigRow = Pick<
  ListingRow,
  | "id"
  | "landlord_id"
  | "price"
  | "deposit_amount"
  | "hold_duration_hours"
  | "max_active_bookings"
  | "total_units"
  | "available_units"
  | "available_from"
  | "is_active"
>;
type BookingWithListingRow = BookingRow & {
  payments: PaymentRow[] | null;
  listing: (ListingRow & {
    county: { name: string } | null;
    town: { name: string } | null;
    area: { name: string } | null;
  }) | null;
};
type BookingDetailRow = BookingRow & {
  payments: PaymentRow[] | null;
  listing: (ListingRow & {
    county: { name: string } | null;
    town: { name: string } | null;
    area: { name: string } | null;
    landlord: Pick<UserRow, "id" | "full_name" | "phone"> | null;
  }) | null;
};
type BookingWithUserRow = BookingRow & {
  user: Pick<UserRow, "id" | "full_name" | "phone" | "role"> | null;
};

export class BookingService {
  private readonly authService: AuthService;
  private readonly chatService: ChatService;
  private readonly imageService: ImageService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
    this.chatService = new ChatService(clientFactory);
    this.imageService = new ImageService(clientFactory);
  }

  getPolicy(): BookingPolicy {
    return {
      reservationWindowHours: BOOKING_RESERVATION_WINDOW_HOURS,
      queueStrategy: "multi_interest_queue",
      requiresPaymentForReservation: true
    };
  }

  getReservationQuote(source: ReservationQuoteSource): ReservationQuote {
    if (typeof source === "number") {
      return {
        depositAmount: Math.max(0, Math.round(source * PREBOOK_DEPOSIT_RATIO)),
        holdDurationHours: BOOKING_RESERVATION_WINDOW_HOURS,
        refundExplanation: PREBOOK_REFUND_EXPLANATION
      };
    }

    const listingPrice = this.toNumber(source.price);
    const storedDepositAmount = this.toNumber(source.deposit_amount);
    const holdDurationHours = this.normalizeHoldDuration(source.hold_duration_hours);

    return {
      depositAmount:
        storedDepositAmount >= 0 ? storedDepositAmount : Math.max(0, Math.round(listingPrice * PREBOOK_DEPOSIT_RATIO)),
      holdDurationHours,
      refundExplanation: PREBOOK_REFUND_EXPLANATION
    };
  }

  buildQueueEntry(listingId: string, userId: string, source: ReservationQuoteSource = 0, now = new Date()): BookingInterest {
    const quote = this.getReservationQuote(source);
    const reservationExpiresAt = new Date(now.getTime() + quote.holdDurationHours * 60 * 60 * 1000);

    return {
      id: `${listingId}-${userId}-${now.getTime()}`,
      listingId,
      userId,
      status: BookingStatus.ACTIVE,
      queuedAt: now.toISOString(),
      reservationExpiresAt: reservationExpiresAt.toISOString(),
      paymentReference: null
    };
  }

  async createBooking(listingId: string, userId?: string) {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.TENANT], client);
    const bookingUserId = this.resolveBookingUserId(actor.id, userId);
    const listing = await this.getListingBookingConfig(client, listingId);

    this.assertListingCanAcceptBookings(listing, bookingUserId);

    const [existingUserActiveCount, activeBookingCount] = await Promise.all([
      this.countActiveBookingsForUserListing(client, listingId, bookingUserId),
      this.countActiveBookingsForListing(client, listingId)
    ]);

    if (existingUserActiveCount > 0) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "You already have an active booking for this listing."
      );
    }

    if (activeBookingCount >= listing.max_active_bookings) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "No booking slots available");
    }

    const expiresAt = this.buildExpiresAt(listing.hold_duration_hours);

    const { data, error } = await client
      .from("bookings")
      .insert({
        user_id: bookingUserId,
        listing_id: listingId,
        status: BookingStatus.ACTIVE,
        deposit_amount: this.toNumber(listing.deposit_amount),
        expires_at: expiresAt
      })
      .select("*")
      .single();

    if (error) {
      throw this.translateBookingMutationError(error);
    }

    try {
      await this.chatService.ensureConversationForBooking(data.id, client);
    } catch (conversationError) {
      await client.from("bookings").delete().eq("id", data.id);
      throw conversationError;
    }

    return this.mapBookingRecord(data);
  }

  async getBookingById(bookingId: string): Promise<BookingDetail> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const { data, error } = await client
      .from("bookings")
      .select(
        `
          *,
          payments:payments(
            id,
            booking_id,
            user_id,
            amount,
            payment_type,
            method,
            status,
            commission_amount,
            refund_amount,
            created_at,
            updated_at
          ),
          listing:listings(
            *,
            county:counties(name),
            town:towns(name),
            area:areas(name),
            landlord:users!listings_landlord_id_fkey(
              id,
              full_name,
              phone
            )
          )
        `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the booking.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested booking does not exist.");
    }

    const row = data as BookingDetailRow;
    this.assertBookingAccess(actor.id, actor.role, row);
    const imagePaths = this.imageService.normalizeStoredPaths(row.listing?.image_paths ?? []);
    const signedUrlMap =
      imagePaths.length > 0
        ? await this.imageService.getSignedImageUrlMap(imagePaths).catch(() => ({}))
        : {};

    return this.mapBookingDetail(row, signedUrlMap);
  }

  async getUserBookings(userId?: string): Promise<UserBooking[]> {
    const client = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(client);
    const targetUserId = this.resolveUserBookingsTarget(actor.id, actor.role, userId);
    const { data, error } = await client
      .from("bookings")
      .select(
        `
          *,
          payments:payments(
            id,
            booking_id,
            user_id,
            amount,
            payment_type,
            method,
            status,
            commission_amount,
            refund_amount,
            created_at,
            updated_at
          ),
          listing:listings(
            id,
            title,
            price,
            listing_type,
            house_type,
            deposit_amount,
            hold_duration_hours,
            max_active_bookings,
            total_units,
            is_active,
            is_verified,
            county:counties(name),
            town:towns(name),
            area:areas(name)
          )
        `
      )
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the user's bookings.", error);
    }

    return (data ?? []).map((row) => this.mapUserBooking(row as BookingWithListingRow));
  }

  async getListingBookings(listingId: string): Promise<ListingBooking[]> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);

    if (actor.role === UserRole.LANDLORD) {
      const { data: listing, error: listingError } = await client
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .eq("landlord_id", actor.id)
        .maybeSingle();

      if (listingError) {
        throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to validate listing ownership.", listingError);
      }

      if (!listing) {
        throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this listing's bookings.");
      }
    }

    const { data, error } = await client
      .from("bookings")
      .select(
        `
          *,
          user:users(id, full_name, phone, role)
        `
      )
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load listing bookings.", error);
    }

    return (data ?? []).map((row) => this.mapListingBooking(row as BookingWithUserRow));
  }

  async expireBookings() {
    const client = this.clientFactory();
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from("bookings")
      .update({
        status: BookingStatus.EXPIRED
      })
      .eq("status", BookingStatus.ACTIVE)
      .lt("expires_at", nowIso)
      .select("*");

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to expire outdated bookings.", error);
    }

    return (data ?? []).map((row) => this.mapBookingRecord(row));
  }

  private async getListingBookingConfig(client: ServiceClient, listingId: string): Promise<ListingBookingConfigRow> {
    const { data, error } = await client
      .from("listings")
      .select(
        "id, landlord_id, price, deposit_amount, hold_duration_hours, max_active_bookings, total_units, available_units, available_from, is_active"
      )
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to validate the target listing.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested listing does not exist.");
    }

    return data;
  }

  private assertListingCanAcceptBookings(listing: ListingBookingConfigRow, bookingUserId: string) {
    if (!listing.is_active) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This listing is not accepting new bookings.");
    }

    if (listing.landlord_id === bookingUserId) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You cannot book your own listing.");
    }

    if (listing.max_active_bookings < 1) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "This listing is not configured with any active booking capacity."
      );
    }

    if (listing.total_units < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This listing has an invalid total unit count.");
    }

    if (this.toNumber(listing.available_units) < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "No booking slots available");
    }

    if (listing.available_from && this.isDateInFuture(listing.available_from)) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "This listing is coming soon and not yet available for booking."
      );
    }

    if (this.toNumber(listing.deposit_amount) < 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This listing has an invalid deposit amount.");
    }

    if (this.toNumber(listing.hold_duration_hours) < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This listing has an invalid hold duration.");
    }
  }

  private async countActiveBookingsForUserListing(client: ServiceClient, listingId: string, userId: string) {
    const { count, error } = await client
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("user_id", userId)
      .eq("status", BookingStatus.ACTIVE);

    if (error) {
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to verify duplicate active bookings for this user.",
        error
      );
    }

    return count ?? 0;
  }

  private async countActiveBookingsForListing(client: ServiceClient, listingId: string) {
    const { count, error } = await client
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("status", BookingStatus.ACTIVE);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to verify booking capacity.", error);
    }

    return count ?? 0;
  }

  private resolveBookingUserId(actorId: string, userId?: string) {
    if (userId && userId !== actorId) {
      throw new ServiceError(
        ServiceErrorCode.FORBIDDEN,
        "Bookings can only be created for the currently authenticated tenant."
      );
    }

    return userId ?? actorId;
  }

  private resolveUserBookingsTarget(actorId: string, actorRole: UserRole, userId?: string) {
    if (!userId || userId === actorId) {
      return actorId;
    }

    if (actorRole !== UserRole.ADMIN) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to another user's bookings.");
    }

    return userId;
  }

  private assertBookingAccess(actorId: string, actorRole: UserRole, row: BookingDetailRow) {
    if (!row.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking listing relation is missing.");
    }

    if (actorRole === UserRole.ADMIN) {
      return;
    }

    if (row.user_id !== actorId && row.listing.landlord_id !== actorId) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this booking.");
    }
  }

  private buildExpiresAt(holdDurationHours: number, now = new Date()) {
    return new Date(now.getTime() + this.normalizeHoldDuration(holdDurationHours) * 60 * 60 * 1000).toISOString();
  }

  private normalizeHoldDuration(holdDurationHours: number | string | null | undefined) {
    const normalizedHours = this.toNumber(holdDurationHours ?? BOOKING_RESERVATION_WINDOW_HOURS);

    return normalizedHours > 0 ? normalizedHours : BOOKING_RESERVATION_WINDOW_HOURS;
  }

  private isDateInFuture(value: string) {
    const today = new Date();
    const todayIso = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      .toISOString()
      .slice(0, 10);

    return value > todayIso;
  }

  private translateBookingMutationError(error: unknown) {
    const normalizedMessage = this.extractErrorMessage(error).toLowerCase();

    if (
      normalizedMessage.includes("active booking already exists") ||
      normalizedMessage.includes("idx_bookings_one_active_entry_per_user_listing")
    ) {
      return new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "You already have an active booking for this listing.",
        error
      );
    }

    if (normalizedMessage.includes("no booking slots available")) {
      return new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "No booking slots available", error);
    }

    if (normalizedMessage.includes("not accepting new bookings")) {
      return new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "This listing is not accepting new bookings.",
        error
      );
    }

    return new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the booking.", error);
  }

  private mapBookingRecord(row: BookingRow) {
    return {
      id: row.id,
      userId: row.user_id,
      listingId: row.listing_id,
      status: row.status,
      depositAmount: this.toNumber(row.deposit_amount),
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapUserBooking(row: BookingWithListingRow): UserBooking {
    const base = this.mapBookingRecord(row);

    if (!row.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking listing relation is missing.");
    }

    return {
      ...base,
      listing: {
        id: row.listing.id,
        title: row.listing.title,
        price: this.toNumber(row.listing.price),
        listingType: row.listing.listing_type,
        houseType: row.listing.house_type,
        areaName: row.listing.area?.name ?? "",
        townName: row.listing.town?.name ?? "",
        countyName: row.listing.county?.name ?? "",
        depositAmount: this.toNumber(row.listing.deposit_amount),
        holdDurationHours: this.normalizeHoldDuration(row.listing.hold_duration_hours),
        maxActiveBookings: row.listing.max_active_bookings,
        totalUnits: row.listing.total_units,
        isActive: row.listing.is_active,
        isVerified: row.listing.is_verified
      },
      paymentSummary: this.mapBookingPaymentSummary(row, row.listing, row.payments)
    };
  }

  private mapListingBooking(row: BookingWithUserRow): ListingBooking {
    const base = this.mapBookingRecord(row);

    if (!row.user) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking user relation is missing.");
    }

    return {
      ...base,
      user: {
        id: row.user.id,
        fullName: row.user.full_name,
        phone: row.user.phone,
        role: row.user.role
      }
    };
  }

  private mapBookingDetail(row: BookingDetailRow, signedUrlMap: Record<string, string>): BookingDetail {
    const base = this.mapBookingRecord(row);

    if (!row.listing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Booking listing relation is missing.");
    }

    const imagePaths = this.imageService.normalizeStoredPaths(row.listing.image_paths ?? []);

    return {
      ...base,
      listing: {
        id: row.listing.id,
        title: row.listing.title,
        price: this.toNumber(row.listing.price),
        listingType: row.listing.listing_type,
        houseType: row.listing.house_type,
        areaName: row.listing.area?.name ?? "",
        townName: row.listing.town?.name ?? "",
        countyName: row.listing.county?.name ?? "",
        depositAmount: this.toNumber(row.listing.deposit_amount),
        holdDurationHours: this.normalizeHoldDuration(row.listing.hold_duration_hours),
        maxActiveBookings: row.listing.max_active_bookings,
        totalUnits: row.listing.total_units,
        isActive: row.listing.is_active,
        isVerified: row.listing.is_verified,
        description: row.listing.description,
        availableFrom: row.listing.available_from,
        mapsLink: row.listing.maps_link,
        latitude: row.listing.latitude,
        longitude: row.listing.longitude,
        imagePaths,
        imageUrls: imagePaths.map((path) => signedUrlMap[path]).filter((value): value is string => Boolean(value)),
        landlordName: row.listing.landlord?.full_name ?? null,
        landlordPhone: row.listing.landlord?.phone ?? null
      },
      paymentSummary: this.mapBookingPaymentSummary(row, row.listing, row.payments)
    };
  }

  private mapBookingPaymentSummary(
    booking: Pick<BookingRow, "status">,
    listing: Pick<ListingRow, "price" | "deposit_amount">,
    payments: PaymentRow[] | null
  ): BookingPaymentSummary {
    const orderedPayments = (payments ?? [])
      .slice()
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    const depositPayment = orderedPayments.find((payment) => payment.payment_type === PaymentType.DEPOSIT) ?? null;
    const rentPayment = orderedPayments.find((payment) => payment.payment_type === PaymentType.RENT) ?? null;
    const remainingRentAmount = Math.max(0, this.toNumber(listing.price) - this.toNumber(listing.deposit_amount));
    const depositPaidAmount =
      depositPayment &&
      [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(depositPayment.status)
        ? this.toNumber(depositPayment.amount)
        : 0;

    return {
      depositPaymentId: depositPayment?.id ?? null,
      depositPaymentStatus: depositPayment?.status ?? null,
      depositPaidAmount,
      refundAmount: depositPayment ? this.toNumber(depositPayment.refund_amount) : 0,
      remainingRentAmount,
      rentPaymentId: rentPayment?.id ?? null,
      rentPaymentStatus: rentPayment?.status ?? null,
      canPayRent:
        booking.status === BookingStatus.ACTIVE &&
        depositPayment?.status === PaymentStatus.CONFIRMED &&
        remainingRentAmount > 0 &&
        rentPayment?.status !== PaymentStatus.CONFIRMED &&
        rentPayment?.status !== PaymentStatus.PENDING
    };
  }

  private extractErrorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = (error as { message?: unknown }).message;

      return typeof message === "string" ? message : "";
    }

    return "";
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
