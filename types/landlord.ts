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
  landlordName: string | null;
  landlordPhone: string | null;
};

export type LandlordHouseRecord = ListingRecord & {
  needsImageRefresh: boolean;
  landlordName: string | null;
  landlordPhone: string | null;
};

export type UpdateLandlordListingInput = {
  title?: string;
  description?: string;
  price?: number;
  totalUnits?: number;
  availableUnits?: number;
  bookingCapacityPerUnit?: number;
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
  unitsCount: number;
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
  bookingIds?: string[];
  unitsCount?: number;
  notes?: string | null;
};

export type MarkHouseAsRentedResult = {
  listing: LandlordHouseRecord;
  rentalEvents: RentalLogRecord[];
};
