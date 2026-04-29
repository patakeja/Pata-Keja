import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_BOOKING_HOLD_DURATION_HOURS,
  DEFAULT_LISTING_TOTAL_UNITS,
  SUPPORTED_LISTING_TYPES
} from "@/config/app";
import { houseTypePresentation } from "@/config/listingPresentation";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { AuthService } from "@/services/auth/auth.service";
import { getPlaceholderListingById, getPlaceholderListings } from "@/services/mock/placeholder-data";
import { LocationService } from "@/services/locations/location.service";
import { ServiceError } from "@/services/shared/service-error";
import { ImageService } from "@/services/storage/image.service";
import type { Database } from "@/types/database";
import {
  HouseType,
  ListingAvailabilityStatus,
  ListingType,
  LocationVisibility,
  ServiceErrorCode,
  UserRole,
  type AuthenticatedUser,
  type CreateListingInput,
  type ListingDetail,
  type ListingFilters,
  type ListingLocationCatalog,
  type ListingPreview,
  type ListingRecord,
  type ListingSummary,
  type UpdateListingImagesInput,
  type UpdateListingInput
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type LocationRow = {
  id: number;
  name: string;
};
type ListingQueryRow = ListingRow & {
  county: LocationRow | null;
  town: LocationRow | null;
  area: LocationRow | null;
};

export class ListingService {
  private readonly authService: AuthService;
  private readonly imageService: ImageService;
  private readonly locationService: LocationService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
    this.imageService = new ImageService(clientFactory);
    this.locationService = new LocationService(clientFactory);
  }

  async getListings(filters: ListingFilters = {}): Promise<ListingSummary[]> {
    const client = this.clientFactory();
    let query = client.from("listings").select(this.listingSelect()).order("created_at", { ascending: false });

    if (filters.listingType) {
      query = query.eq("listing_type", filters.listingType);
    }

    if (filters.houseType) {
      query = query.eq("house_type", filters.houseType);
    }

    if (typeof filters.countyId === "number") {
      query = query.eq("county_id", filters.countyId);
    }

    if (typeof filters.townId === "number") {
      query = query.eq("town_id", filters.townId);
    }

    if (typeof filters.areaId === "number") {
      query = query.eq("area_id", filters.areaId);
    }

    if (filters.landlordId) {
      query = query.eq("landlord_id", filters.landlordId);
    }

    if (typeof filters.minPrice === "number") {
      query = query.gte("price", filters.minPrice);
    }

    if (typeof filters.maxPrice === "number") {
      query = query.lte("price", filters.maxPrice);
    }

    if (typeof filters.isActive === "boolean") {
      query = query.eq("is_active", filters.isActive);
    }

    if (typeof filters.isVerified === "boolean") {
      query = query.eq("is_verified", filters.isVerified);
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 24;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load listings.", error);
    }

    const rows = (data ?? []) as unknown as ListingQueryRow[];
    const coverImagePaths = rows
      .map((row) => this.getCoverImagePath(row))
      .filter((value): value is string => Boolean(value));
    const signedUrlMap = await this.buildSignedUrlMap(coverImagePaths);

    return rows.map((row) => this.mapListingSummary(row, signedUrlMap[this.getCoverImagePath(row) ?? ""] ?? null));
  }

  async getListingById(id: string): Promise<ListingRecord | null> {
    const client = this.clientFactory();
    const { data, error } = await client.from("listings").select(this.listingSelect()).eq("id", id).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the listing.", error);
    }

    if (!data) {
      return null;
    }

    const listing = data as unknown as ListingQueryRow;
    const landlord = await this.getLandlordById(client, listing.landlord_id);
    const imagePaths = this.getOrderedImagePaths(listing);
    const signedUrlMap = await this.buildSignedUrlMap(imagePaths);

    return this.mapListingRecord(listing, landlord, signedUrlMap);
  }

  async createListing(data: CreateListingInput): Promise<ListingRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const payload = this.buildCreateListingPayload(data, actor.id);
    const { data: createdListing, error } = await client.from("listings").insert(payload).select("id").single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the listing.", error);
    }

    const createdRecord = await this.getListingById(createdListing.id);

    if (!createdRecord) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "The newly created listing could not be reloaded.");
    }

    return createdRecord;
  }

  async updateListing(listingId: string, input: UpdateListingInput): Promise<ListingRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    const existingListing = await this.requireManagedListing(client, listingId, actor);
    const payload = this.buildUpdateListingPayload(existingListing, input);

    const { error } = await client.from("listings").update(payload).eq("id", listingId);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to update the listing.", error);
    }

    const updatedListing = await this.getListingById(listingId);

    if (!updatedListing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "The updated listing could not be reloaded.");
    }

    return updatedListing;
  }

  async updateListingImages(listingId: string, input: UpdateListingImagesInput): Promise<ListingRecord> {
    const client = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD, UserRole.ADMIN], client);
    await this.requireManagedListing(client, listingId, actor);

    const imagePaths = this.imageService.normalizeStoredPaths(input.imagePaths);

    if (imagePaths.length > this.imageService.getMaxImageCount()) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        `You can store up to ${this.imageService.getMaxImageCount()} images per listing.`
      );
    }

    const resolvedCoverImagePath = input.coverImagePath
      ? this.imageService.normalizeStoredPaths([input.coverImagePath])[0] ?? null
      : imagePaths[0] ?? null;

    if (resolvedCoverImagePath && !imagePaths.includes(resolvedCoverImagePath)) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        "The cover image must be included in the listing gallery."
      );
    }

    const orderedImagePaths = resolvedCoverImagePath
      ? [resolvedCoverImagePath, ...imagePaths.filter((path) => path !== resolvedCoverImagePath)]
      : imagePaths;

    const { error } = await client
      .from("listings")
      .update({
        image_paths: orderedImagePaths,
        cover_image: resolvedCoverImagePath
      })
      .eq("id", listingId);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to save listing image metadata.", error);
    }

    const updatedListing = await this.getListingById(listingId);

    if (!updatedListing) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "The updated listing could not be reloaded.");
    }

    return updatedListing;
  }

  async getLocationCatalog(): Promise<ListingLocationCatalog> {
    if (!isSupabaseConfigured()) {
      return {
        counties: [],
        towns: [],
        areas: []
      };
    }

    return this.locationService.getLocationCatalog();
  }

  async getPublicListings(filters: ListingFilters = {}) {
    if (!isSupabaseConfigured()) {
      return this.filterPublicPreviews(await getPlaceholderListings(), filters);
    }

    try {
      const listings = await this.getListings({
        ...filters,
        isActive: true,
        limit: filters.limit ?? 24
      });

      return listings
        .filter((listing) => this.isPubliclyVisible(listing))
        .map((listing) => this.mapListingPreview(listing));
    } catch {
      return this.filterPublicPreviews(await getPlaceholderListings(), filters);
    }
  }

  async getPublicListingById(id: string) {
    if (!isSupabaseConfigured()) {
      return getPlaceholderListingById(id);
    }

    try {
      const listing = await this.getListingById(id);

      if (!listing || !this.isPubliclyVisible(listing)) {
        return null;
      }

      return this.mapPublicListingDetail(listing);
    } catch {
      return getPlaceholderListingById(id);
    }
  }

  getSupportedListingTypes() {
    return [...SUPPORTED_LISTING_TYPES];
  }

  private listingSelect() {
    return "*,county:counties(id,name),town:towns(id,name),area:areas(id,name)";
  }

  private buildCreateListingPayload(data: CreateListingInput, landlordId: string) {
    const title = data.title.trim();
    const description = data.description.trim();

    if (!title) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Listing title is required.");
    }

    if (!description) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Listing description is required.");
    }

    if (!Number.isFinite(data.price) || data.price < 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Listing price must be zero or greater.");
    }

    this.assertLocationId(data.countyId, "county");
    this.assertLocationId(data.townId, "town");
    this.assertLocationId(data.areaId, "area");

    const totalUnits = this.normalizePositiveInteger(data.totalUnits, DEFAULT_LISTING_TOTAL_UNITS, "Total units");
    const availableUnits = this.normalizeAvailableUnits(data.availableUnits, totalUnits);
    const holdDurationHours = this.normalizePositiveInteger(
      data.holdDurationHours,
      DEFAULT_BOOKING_HOLD_DURATION_HOURS,
      "Hold duration"
    );
    const depositAmount = this.normalizeNonNegativeNumber(data.depositAmount, 0, "Deposit amount");

    return {
      title,
      description,
      price: this.roundMoney(data.price),
      listing_type: data.listingType,
      house_type: data.houseType,
      landlord_id: landlordId,
      county_id: data.countyId,
      town_id: data.townId,
      area_id: data.areaId,
      total_units: totalUnits,
      available_units: availableUnits,
      deposit_amount: depositAmount,
      hold_duration_hours: holdDurationHours,
      available_from: this.normalizeAvailableFrom(data.availableFrom),
      latitude: this.normalizeCoordinate(data.latitude, "latitude"),
      longitude: this.normalizeCoordinate(data.longitude, "longitude"),
      maps_link: data.mapsLink?.trim() || null,
      is_active: typeof data.isActive === "boolean" ? data.isActive : true,
      image_paths: [],
      cover_image: null
    };
  }

  private buildUpdateListingPayload(existingListing: ListingRow, input: UpdateListingInput) {
    const nextTitle = typeof input.title === "string" ? input.title.trim() : existingListing.title;
    const nextDescription =
      typeof input.description === "string" ? input.description.trim() : existingListing.description;

    if (!nextTitle) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Listing title is required.");
    }

    if (!nextDescription) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Listing description is required.");
    }

    const nextTotalUnits = this.normalizePositiveInteger(
      input.totalUnits,
      existingListing.total_units,
      "Total units"
    );
    const nextAvailableUnits = this.normalizeAvailableUnits(
      typeof input.availableUnits === "number" ? input.availableUnits : existingListing.available_units,
      nextTotalUnits
    );
    const nextPrice = this.normalizeNonNegativeNumber(input.price, this.toNumber(existingListing.price), "Price");
    const nextDepositAmount = this.normalizeNonNegativeNumber(
      input.depositAmount,
      this.toNumber(existingListing.deposit_amount),
      "Deposit amount"
    );
    const nextHoldDurationHours = this.normalizePositiveInteger(
      input.holdDurationHours,
      existingListing.hold_duration_hours,
      "Hold duration"
    );

    return {
      title: nextTitle,
      description: nextDescription,
      price: nextPrice,
      total_units: nextTotalUnits,
      available_units: nextAvailableUnits,
      deposit_amount: nextDepositAmount,
      hold_duration_hours: nextHoldDurationHours,
      available_from: this.normalizeAvailableFrom(
        typeof input.availableFrom === "undefined" ? existingListing.available_from : input.availableFrom
      ),
      maps_link:
        typeof input.mapsLink === "string"
          ? input.mapsLink.trim() || null
          : typeof input.mapsLink === "object" && input.mapsLink === null
            ? null
            : existingListing.maps_link,
      is_active: typeof input.isActive === "boolean" ? input.isActive : existingListing.is_active
    };
  }

  private mapListingSummary(row: ListingQueryRow, primaryImageUrl: string | null): ListingSummary {
    const orderedImagePaths = this.getOrderedImagePaths(row);
    const primaryImagePath = orderedImagePaths[0] ?? null;
    const availabilityStatus = this.getAvailabilityStatus(row.available_units, row.available_from);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      price: this.toNumber(row.price),
      listingType: row.listing_type,
      houseType: row.house_type,
      landlordId: row.landlord_id,
      countyId: row.county_id,
      countyName: row.county?.name ?? "",
      townId: row.town_id,
      townName: row.town?.name ?? "",
      areaId: row.area_id,
      areaName: row.area?.name ?? "",
      totalUnits: this.toNumber(row.total_units),
      availableUnits: this.toNumber(row.available_units),
      maxActiveBookings: this.toNumber(row.max_active_bookings),
      depositAmount: this.toNumber(row.deposit_amount),
      holdDurationHours: this.toNumber(row.hold_duration_hours),
      availableFrom: row.available_from,
      latitude: row.latitude,
      longitude: row.longitude,
      mapsLink: row.maps_link,
      isVerified: row.is_verified,
      isActive: row.is_active,
      availabilityStatus,
      imagePaths: orderedImagePaths,
      coverImagePath: this.getCoverImagePath(row),
      primaryImagePath,
      primaryImageUrl,
      lastImageUpdateAt: row.last_image_update_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapListingRecord(
    row: ListingQueryRow,
    landlord: Pick<UserRow, "id" | "full_name" | "phone"> | null,
    signedUrlMap: Record<string, string>
  ): ListingRecord {
    const summary = this.mapListingSummary(row, signedUrlMap[this.getCoverImagePath(row) ?? ""] ?? null);

    return {
      ...summary,
      images: summary.imagePaths.map((path, index) => ({
        id: `${row.id}-${index}`,
        path,
        signedUrl: signedUrlMap[path] ?? null,
        sortOrder: index,
        createdAt: row.last_image_update_at ?? row.created_at,
        isCover: path === summary.coverImagePath
      })),
      landlord: landlord
        ? {
            id: landlord.id,
            fullName: landlord.full_name,
            phone: landlord.phone
          }
        : null
    };
  }

  private mapListingPreview(listing: ListingSummary): ListingPreview {
    const presentation = houseTypePresentation[listing.houseType] ?? houseTypePresentation[HouseType.APARTMENT];

    return {
      id: listing.id,
      title: listing.title,
      type: listing.listingType,
      houseType: listing.houseType,
      summary: this.truncateText(listing.description, 140),
      priceLabel: this.formatPriceLabel(listing.price, listing.listingType),
      areaLabel: this.formatAreaLabel(listing.areaName, listing.townName, listing.countyName),
      bedrooms: presentation.bedrooms,
      bathrooms: presentation.bathrooms,
      guests: presentation.guests,
      imageUrl: listing.primaryImageUrl,
      availabilityStatus: listing.availabilityStatus,
      availableFrom: listing.availableFrom,
      coverTone: presentation.coverTone
    };
  }

  private mapPublicListingDetail(listing: ListingRecord): ListingDetail {
    const preview = this.mapListingPreview(listing);

    return {
      ...preview,
      amenities: [],
      hostLabel: listing.landlord ? `Managed by ${listing.landlord.fullName}` : "Managed by Pata Keja",
      availabilityLabel: this.getAvailabilityLabel(listing.availabilityStatus, listing.availableFrom),
      locationVisibility: LocationVisibility.APPROXIMATE,
      exactLocationHint: "Exact location is only revealed after authentication.",
      imageUrls: listing.images
        .map((image) => image.signedUrl)
        .filter((value): value is string => Boolean(value)),
      imagePaths: [...listing.imagePaths],
      canReserve: listing.availabilityStatus === ListingAvailabilityStatus.AVAILABLE
    };
  }

  private async buildSignedUrlMap(paths: string[]) {
    if (paths.length === 0) {
      return {};
    }

    try {
      return await this.imageService.getSignedImageUrlMap(paths);
    } catch {
      return {};
    }
  }

  private getOrderedImagePaths(row: Pick<ListingRow, "image_paths" | "cover_image">) {
    const normalizedPaths = this.imageService.normalizeStoredPaths(row.image_paths ?? []);
    const coverImagePath = row.cover_image ? this.imageService.normalizeStoredPaths([row.cover_image])[0] ?? null : null;

    if (!coverImagePath || !normalizedPaths.includes(coverImagePath)) {
      return normalizedPaths;
    }

    return [coverImagePath, ...normalizedPaths.filter((path) => path !== coverImagePath)];
  }

  private getCoverImagePath(row: Pick<ListingRow, "image_paths" | "cover_image">) {
    return this.getOrderedImagePaths(row)[0] ?? null;
  }

  private getAvailabilityStatus(availableUnits: number | string | null | undefined, availableFrom: string | null) {
    if (this.toNumber(availableUnits) <= 0) {
      return ListingAvailabilityStatus.FULL;
    }

    if (availableFrom && this.isDateInFuture(availableFrom)) {
      return ListingAvailabilityStatus.COMING_SOON;
    }

    return ListingAvailabilityStatus.AVAILABLE;
  }

  private getAvailabilityLabel(status: ListingAvailabilityStatus, availableFrom: string | null) {
    if (status === ListingAvailabilityStatus.FULL) {
      return "Currently full";
    }

    if (status === ListingAvailabilityStatus.COMING_SOON) {
      return availableFrom ? `Available from ${availableFrom}` : "Coming soon";
    }

    return "Accepting new booking requests";
  }

  private isPubliclyVisible(listing: Pick<ListingSummary, "isActive" | "availabilityStatus">) {
    return listing.isActive && listing.availabilityStatus !== ListingAvailabilityStatus.FULL;
  }

  private formatPriceLabel(price: number, listingType: ListingType) {
    const formatter = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    });
    const cadence = listingType === ListingType.SHORT_STAY ? "night" : "month";

    return `${formatter.format(price)} / ${cadence}`;
  }

  private formatAreaLabel(areaName: string, townName: string, countyName: string) {
    return [areaName, townName, countyName].filter(Boolean).join(", ");
  }

  private truncateText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private normalizePositiveInteger(value: number | undefined, fallback: number, label: string) {
    const candidate = typeof value === "number" ? value : fallback;

    if (!Number.isFinite(candidate) || candidate < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, `${label} must be at least 1.`);
    }

    return Math.trunc(candidate);
  }

  private normalizeAvailableUnits(value: number | undefined, totalUnits: number) {
    const candidate = typeof value === "number" ? value : totalUnits;

    if (!Number.isFinite(candidate) || candidate < 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Available units cannot be negative.");
    }

    const normalizedValue = Math.trunc(candidate);

    if (normalizedValue > totalUnits) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Available units cannot exceed total units.");
    }

    return normalizedValue;
  }

  private normalizeNonNegativeNumber(value: number | undefined, fallback: number, label: string) {
    const candidate = typeof value === "number" ? value : fallback;

    if (!Number.isFinite(candidate) || candidate < 0) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, `${label} cannot be negative.`);
    }

    return this.roundMoney(candidate);
  }

  private normalizeCoordinate(value: number | null | undefined, axis: "latitude" | "longitude") {
    if (typeof value !== "number") {
      return null;
    }

    const range = axis === "latitude" ? 90 : 180;

    if (!Number.isFinite(value) || value < range * -1 || value > range) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, `${axis} is out of range.`);
    }

    return value;
  }

  private normalizeAvailableFrom(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Available from must be a valid date.");
    }

    return normalizedValue;
  }

  private assertLocationId(value: number, label: string) {
    if (!Number.isFinite(value) || value < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, `A valid ${label} is required.`);
    }
  }

  private async getLandlordById(client: ServiceClient, landlordId: string) {
    const { data, error } = await client.from("users").select("id, full_name, phone").eq("id", landlordId).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the landlord profile.", error);
    }

    return data;
  }

  private async requireManagedListing(client: ServiceClient, listingId: string, actor: AuthenticatedUser) {
    const { data, error } = await client.from("listings").select("*").eq("id", listingId).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to verify listing ownership.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested listing does not exist.");
    }

    if (actor.role !== UserRole.ADMIN && data.landlord_id !== actor.id) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to manage this listing.");
    }

    return data;
  }

  private filterPublicPreviews(listings: ListingPreview[], filters: ListingFilters) {
    return listings.filter((listing) => {
      const matchesType = !filters.listingType || listing.type === filters.listingType;
      const matchesHouseType = !filters.houseType || listing.houseType === filters.houseType;
      const matchesSearch =
        !filters.search ||
        `${listing.title} ${listing.areaLabel}`.toLowerCase().includes(filters.search.trim().toLowerCase());

      return matchesType && matchesHouseType && matchesSearch;
    });
  }

  private isDateInFuture(value: string) {
    const today = new Date();
    const todayIso = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      .toISOString()
      .slice(0, 10);

    return value > todayIso;
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
