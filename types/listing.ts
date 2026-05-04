import type { LocationCatalog } from "./location";

export enum ListingType {
  LONG_TERM = "long_term",
  SHORT_STAY = "short_stay"
}

export enum HouseType {
  SINGLE_ROOM = "single_room",
  BEDSITTER = "bedsitter",
  STUDIO = "studio",
  ONE_BEDROOM = "one_bedroom",
  TWO_BEDROOM = "two_bedroom",
  THREE_BEDROOM = "three_bedroom",
  FOUR_BEDROOM = "four_bedroom",
  FIVE_BEDROOM_PLUS = "five_bedroom_plus",
  MAISONETTE = "maisonette",
  TOWNHOUSE = "townhouse",
  BUNGALOW = "bungalow",
  VILLA = "villa",
  APARTMENT = "apartment"
}

export enum LocationVisibility {
  APPROXIMATE = "approximate",
  PRECISE = "precise",
  HIDDEN = "hidden"
}

export enum ListingAvailabilityStatus {
  AVAILABLE = "available",
  FULL = "full",
  COMING_SOON = "coming_soon"
}

export type ListingPreview = {
  id: string;
  title: string;
  type: ListingType;
  houseType?: HouseType;
  summary: string;
  priceLabel: string;
  areaLabel: string;
  bedrooms: number;
  bathrooms: number;
  guests?: number;
  imageUrl?: string | null;
  availabilityStatus: ListingAvailabilityStatus;
  availableFrom: string | null;
  coverTone: string;
};

export type ListingDetail = ListingPreview & {
  amenities: string[];
  hostLabel: string;
  availabilityLabel: string;
  locationVisibility: LocationVisibility;
  exactLocationHint: string;
  imageUrls?: string[];
  imagePaths?: string[];
  canReserve: boolean;
};

export type ListingFilters = {
  listingType?: ListingType;
  houseType?: HouseType;
  countyId?: number;
  townId?: number;
  areaId?: number;
  landlordId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isVerified?: boolean;
  search?: string;
  limit?: number;
  page?: number;
};

export type ListingImageRecord = {
  id: string;
  path: string;
  signedUrl: string | null;
  sortOrder: number;
  createdAt: string;
  isCover: boolean;
};

export type ListingSummary = {
  id: string;
  title: string;
  description: string;
  price: number;
  listingType: ListingType;
  houseType: HouseType;
  landlordId: string;
  countyId: number;
  countyName: string;
  townId: number;
  townName: string;
  areaId: number;
  areaName: string;
  totalUnits: number;
  availableUnits: number;
  maxActiveBookings: number;
  depositAmount: number;
  holdDurationHours: number;
  availableFrom: string | null;
  latitude: number | null;
  longitude: number | null;
  mapsLink: string | null;
  isVerified: boolean;
  isActive: boolean;
  availabilityStatus: ListingAvailabilityStatus;
  imagePaths: string[];
  coverImagePath: string | null;
  primaryImagePath: string | null;
  primaryImageUrl: string | null;
  lastImageUpdateAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListingRecord = ListingSummary & {
  images: ListingImageRecord[];
  landlord: {
    id: string;
    fullName: string;
    phone: string | null;
  } | null;
};

export type CreateListingInput = {
  title: string;
  description: string;
  price: number;
  listingType: ListingType;
  houseType: HouseType;
  landlordId?: string;
  countyId: number;
  townId: number;
  areaId: number;
  totalUnits?: number;
  availableUnits?: number;
  depositAmount?: number;
  holdDurationHours?: number;
  availableFrom?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsLink?: string | null;
  isActive?: boolean;
};

export type UpdateListingInput = {
  title?: string;
  description?: string;
  price?: number;
  totalUnits?: number;
  availableUnits?: number;
  depositAmount?: number;
  holdDurationHours?: number;
  availableFrom?: string | null;
  mapsLink?: string | null;
  isActive?: boolean;
};

export type UpdateListingImagesInput = {
  imagePaths: string[];
  coverImagePath?: string | null;
};

export type ListingLocationCatalog = LocationCatalog;

export type ListingImageUploadProgress = {
  stage: "compressing" | "uploading";
  current: number;
  total: number;
  fileName: string;
  percent: number;
};

export type ListingPublishProgress = {
  stage: "compressing" | "uploading" | "saving";
  current: number;
  total: number;
  percent: number;
  fileName?: string;
  message: string;
};
