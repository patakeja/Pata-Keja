import type { SupabaseClient } from "@supabase/supabase-js";

import { LANDLORD_IMAGE_REFRESH_RECOMMENDATION_DAYS } from "@/config/landlord";
import { AuthService } from "@/services/auth/auth.service";
import { BookingService } from "@/services/bookings/booking.service";
import { ListingService } from "@/services/listings/listing.service";
import { ServiceError } from "@/services/shared/service-error";
import { ImageService } from "@/services/storage/image.service";
import type { Database } from "@/types/database";
import {
  BookingStatus,
  RentalSource,
  ServiceErrorCode,
  UserRole,
  type AuthenticatedUser,
  type LandlordDashboardSummary,
  type LandlordHouseRecord,
  type LandlordHouseSummary,
  type ListingImageUploadProgress,
  type MarkHouseAsRentedInput,
  type MarkHouseAsRentedResult,
  type PlatformBookingOption,
  type RentalLogRecord,
  type UpdateLandlordListingInput
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type RentalEventRow = Database["public"]["Tables"]["rental_events"]["Row"];
type UpdateHouseOptions = {
  imageFiles?: File[];
  replaceImages?: boolean;
  onProgress?: (progress: ListingImageUploadProgress) => void;
};

export class LandlordService {
  private readonly authService: AuthService;
  private readonly bookingService: BookingService;
  private readonly listingService: ListingService;
  private readonly imageService: ImageService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
    this.bookingService = new BookingService(clientFactory);
    this.listingService = new ListingService(clientFactory);
    this.imageService = new ImageService(clientFactory);
  }

  async getDashboardSummary(): Promise<LandlordDashboardSummary> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const listingRows = await this.getManagedListingRows(client, actor);

    if (listingRows.length === 0) {
      return {
        totalHouses: 0,
        totalAvailableUnits: 0,
        activeBookings: 0,
        comingSoonHouses: 0,
        staleImageListings: 0,
        pendingExternalRentalAlerts: 0
      };
    }

    const listingIds = listingRows.map((listing) => listing.id);
    const [activeBookingsResult, pendingAlertsResult] = await Promise.all([
      client
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("listing_id", listingIds)
        .eq("status", BookingStatus.ACTIVE),
      client
        .from("rental_events")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", actor.id)
        .eq("admin_review_required", true)
        .is("admin_reviewed_at", null)
    ]);

    if (activeBookingsResult.error) {
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to load the landlord booking snapshot.",
        activeBookingsResult.error
      );
    }

    if (pendingAlertsResult.error) {
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to load pending external rental alerts.",
        pendingAlertsResult.error
      );
    }

    return {
      totalHouses: listingRows.length,
      totalAvailableUnits: listingRows.reduce((sum, listing) => sum + this.toNumber(listing.available_units), 0),
      activeBookings: activeBookingsResult.count ?? 0,
      comingSoonHouses: listingRows.filter((listing) => this.isComingSoon(listing.available_from)).length,
      staleImageListings: listingRows.filter((listing) => this.needsImageRefresh(listing.last_image_update_at)).length,
      pendingExternalRentalAlerts: pendingAlertsResult.count ?? 0
    };
  }

  async getMyHouses(): Promise<LandlordHouseSummary[]> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const listings = await this.listingService.getListings({
      landlordId: actor.id,
      limit: 200,
      page: 1
    });

    return listings.map((listing) => ({
      ...listing,
      needsImageRefresh: this.needsImageRefresh(listing.lastImageUpdateAt)
    }));
  }

  async getHouseById(listingId: string): Promise<LandlordHouseRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const listing = await this.requireManagedListing(listingId, actor);

    return {
      ...listing,
      needsImageRefresh: this.needsImageRefresh(listing.lastImageUpdateAt)
    };
  }

  async updateHouse(
    listingId: string,
    input: UpdateLandlordListingInput,
    options?: UpdateHouseOptions
  ): Promise<LandlordHouseRecord> {
    const currentListing = await this.getHouseById(listingId);
    let updatedListing = await this.listingService.updateListing(listingId, input);
    const shouldReplaceImages = Boolean(options?.replaceImages);
    const nextImageFiles = options?.imageFiles ?? [];

    if (shouldReplaceImages) {
      const previousPaths = [...currentListing.imagePaths];

      if (nextImageFiles.length === 0) {
        updatedListing = await this.listingService.updateListingImages(listingId, {
          imagePaths: [],
          coverImagePath: null
        });

        if (previousPaths.length > 0) {
          try {
            await this.imageService.deleteListingImages(previousPaths);
          } catch {
            // Ignore storage cleanup failures after the metadata has already been saved.
          }
        }
      } else {
        const uploadedPaths = await this.imageService.uploadListingImages(listingId, nextImageFiles, {
          onProgress: options?.onProgress
        });

        try {
          updatedListing = await this.listingService.updateListingImages(listingId, {
            imagePaths: uploadedPaths,
            coverImagePath: uploadedPaths[0] ?? null
          });
        } catch (error) {
          try {
            await this.imageService.deleteListingImages(uploadedPaths);
          } catch {
            // Ignore cleanup failures so the listing update error stays visible.
          }

          throw error;
        }

        const obsoletePaths = previousPaths.filter((path) => !uploadedPaths.includes(path));

        if (obsoletePaths.length > 0) {
          try {
            await this.imageService.deleteListingImages(obsoletePaths);
          } catch {
            // Ignore storage cleanup failures after the new gallery has been saved.
          }
        }
      }
    }

    return {
      ...updatedListing,
      needsImageRefresh: this.needsImageRefresh(updatedListing.lastImageUpdateAt)
    };
  }

  async getPlatformBookingOptions(listingId: string): Promise<PlatformBookingOption[]> {
    const bookings = await this.bookingService.getListingBookings(listingId);

    return bookings
      .filter((booking) => booking.status === BookingStatus.ACTIVE)
      .map((booking) => ({
        id: booking.id,
        tenantName: booking.user.fullName,
        status: booking.status,
        createdAt: booking.createdAt
      }));
  }

  async markHouseAsRented(input: MarkHouseAsRentedInput): Promise<MarkHouseAsRentedResult> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const listing = await this.requireManagedListing(input.listingId, actor);

    if (listing.availableUnits < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "This house has no available units to allocate.");
    }

    let linkedBookingId: string | null = null;

    if (input.source === RentalSource.PLATFORM) {
      if (!input.bookingId) {
        throw new ServiceError(
          ServiceErrorCode.VALIDATION_ERROR,
          "Select the linked booking before marking the house as rented."
        );
      }

      const bookingOptions = await this.bookingService.getListingBookings(input.listingId);
      const matchedBooking = bookingOptions.find((booking) => booking.id === input.bookingId);

      if (!matchedBooking) {
        throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The selected booking was not found for this listing.");
      }

      if (matchedBooking.status !== BookingStatus.ACTIVE) {
        throw new ServiceError(
          ServiceErrorCode.VALIDATION_ERROR,
          "Only active booking queue entries can be linked to a platform rental."
        );
      }

      const { error: bookingUpdateError } = await client
        .from("bookings")
        .update({
          status: BookingStatus.COMPLETED,
          expires_at: null
        })
        .eq("id", matchedBooking.id);

      if (bookingUpdateError) {
        throw new ServiceError(
          ServiceErrorCode.DATABASE_ERROR,
          "Unable to complete the linked platform booking.",
          bookingUpdateError
        );
      }

      linkedBookingId = matchedBooking.id;
    }

    const { data: rentalEvent, error: rentalEventError } = await client
      .from("rental_events")
      .insert({
        listing_id: listing.id,
        landlord_id: listing.landlordId,
        booking_id: linkedBookingId,
        source: input.source,
        notes: input.notes?.trim() || null,
        admin_review_required: input.source === RentalSource.EXTERNAL
      })
      .select("*")
      .single();

    if (rentalEventError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to log the rental event.", rentalEventError);
    }

    const updatedListing = await this.listingService.updateListing(listing.id, {
      availableUnits: Math.max(0, listing.availableUnits - 1)
    });

    return {
      listing: {
        ...updatedListing,
        needsImageRefresh: this.needsImageRefresh(updatedListing.lastImageUpdateAt)
      },
      rentalEvent: this.mapRentalEvent(rentalEvent)
    };
  }

  private async requireManagedListing(listingId: string, actor: AuthenticatedUser) {
    const listing = await this.listingService.getListingById(listingId);

    if (!listing) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested listing does not exist.");
    }

    if (actor.role !== UserRole.ADMIN && listing.landlordId !== actor.id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to manage this house.");
    }

    return listing;
  }

  private async getManagedListingRows(client: ServiceClient, actor: AuthenticatedUser) {
    const query = client
      .from("listings")
      .select("id, available_units, available_from, last_image_update_at, landlord_id")
      .order("created_at", { ascending: false });

    const scopedQuery =
      actor.role === UserRole.ADMIN ? query.eq("landlord_id", actor.id) : query.eq("landlord_id", actor.id);
    const { data, error } = await scopedQuery;

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load landlord listings.", error);
    }

    return data ?? [];
  }

  private mapRentalEvent(row: RentalEventRow): RentalLogRecord {
    return {
      id: row.id,
      listingId: row.listing_id,
      landlordId: row.landlord_id,
      bookingId: row.booking_id,
      source: row.source,
      notes: row.notes,
      adminReviewRequired: row.admin_review_required,
      adminReviewedAt: row.admin_reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private needsImageRefresh(lastImageUpdateAt: string | null) {
    if (!lastImageUpdateAt) {
      return true;
    }

    const ageInDays =
      (Date.now() - new Date(lastImageUpdateAt).getTime()) / (1000 * 60 * 60 * 24);

    return ageInDays >= LANDLORD_IMAGE_REFRESH_RECOMMENDATION_DAYS;
  }

  private isComingSoon(availableFrom: string | null) {
    if (!availableFrom) {
      return false;
    }

    const today = new Date();
    const todayIso = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      .toISOString()
      .slice(0, 10);

    return availableFrom > todayIso;
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
