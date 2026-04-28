import type { BookingStatus } from "./booking";
import type { ListingRecord, ListingSummary } from "./listing";

export enum RentalSource {
  PLATFORM = "platform",
  EXTERNAL = "external"
}

export type LandlordDashboardSummary = {
  totalHouses: number;
  totalAvailableUnits: number;
  activeBookings: number;
  comingSoonHouses: number;
  staleImageListings: number;
  pendingExternalRentalAlerts: number;
};

export type LandlordHouseSummary = ListingSummary & {
  needsImageRefresh: boolean;
};

export type LandlordHouseRecord = ListingRecord & {
  needsImageRefresh: boolean;
};

export type UpdateLandlordListingInput = {
  title?: string;
  description?: string;
  price?: number;
  totalUnits?: number;
  availableUnits?: number;
  availableFrom?: string | null;
  depositAmount?: number;
  holdDurationHours?: number;
  mapsLink?: string | null;
  isActive?: boolean;
};

export type PlatformBookingOption = {
  id: string;
  tenantName: string;
  status: BookingStatus;
  createdAt: string;
};

export type RentalLogRecord = {
  id: string;
  listingId: string;
  landlordId: string;
  bookingId: string | null;
  source: RentalSource;
  notes: string | null;
  adminReviewRequired: boolean;
  adminReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarkHouseAsRentedInput = {
  listingId: string;
  source: RentalSource;
  bookingId?: string | null;
  notes?: string | null;
};

export type MarkHouseAsRentedResult = {
  listing: LandlordHouseRecord;
  rentalEvent: RentalLogRecord;
};
