import {
  HouseType,
  ListingAvailabilityStatus,
  LocationVisibility,
  ListingDetail,
  ListingPreview,
  ListingType
} from "@/types";

const listings: ListingDetail[] = [
  {
    id: "sunlit-two-bed",
    title: "Sunlit Two-Bed Apartment",
    type: ListingType.LONG_TERM,
    houseType: HouseType.TWO_BEDROOM,
    summary: "Bright long-term apartment with room to settle in comfortably.",
    priceLabel: "From KES 68,000 / month",
    areaLabel: "Approximate area visible before sign-in",
    bedrooms: 2,
    bathrooms: 2,
    imageUrl: null,
    availabilityStatus: ListingAvailabilityStatus.AVAILABLE,
    availableFrom: null,
    coverTone: "from-[#E7D4BC] via-[#FBF6EF] to-white",
    amenities: ["Balcony", "Backup water", "Parking"],
    hostLabel: "Managed by landlord workspace",
    availabilityLabel: "Available to reserve now",
    locationVisibility: LocationVisibility.APPROXIMATE,
    exactLocationHint: "Exact location is revealed after authentication.",
    imageUrls: [],
    canReserve: true
  },
  {
    id: "compact-studio-retreat",
    title: "Compact Studio Retreat",
    type: ListingType.SHORT_STAY,
    houseType: HouseType.STUDIO,
    summary: "Comfortable short-stay studio for quick city visits and flexible weekends.",
    priceLabel: "From KES 6,500 / night",
    areaLabel: "Approximate area visible before sign-in",
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    imageUrl: null,
    availabilityStatus: ListingAvailabilityStatus.COMING_SOON,
    availableFrom: "2026-05-15",
    coverTone: "from-emerald-200 via-emerald-50 to-white",
    amenities: ["Self check-in", "Wi-Fi", "Workspace"],
    hostLabel: "Managed by landlord workspace",
    availabilityLabel: "Opening soon for short-stay bookings",
    locationVisibility: LocationVisibility.APPROXIMATE,
    exactLocationHint: "Exact location is revealed after authentication.",
    imageUrls: [],
    canReserve: false
  },
  {
    id: "garden-townhouse-escape",
    title: "Garden Townhouse Escape",
    type: ListingType.LONG_TERM,
    houseType: HouseType.TOWNHOUSE,
    summary: "Spacious townhouse with extra room for families and longer stays.",
    priceLabel: "From KES 120,000 / month",
    areaLabel: "Approximate area visible before sign-in",
    bedrooms: 3,
    bathrooms: 3,
    imageUrl: null,
    availabilityStatus: ListingAvailabilityStatus.AVAILABLE,
    availableFrom: null,
    coverTone: "from-[#D7F3E5] via-[#F8F1E8] to-white",
    amenities: ["Private garden", "Pet friendly", "Storage room"],
    hostLabel: "Managed by landlord workspace",
    availabilityLabel: "Available with fast booking support",
    locationVisibility: LocationVisibility.APPROXIMATE,
    exactLocationHint: "Exact location is revealed after authentication.",
    imageUrls: [],
    canReserve: true
  }
];

export async function getPlaceholderListings(): Promise<ListingPreview[]> {
  return listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    type: listing.type,
    houseType: listing.houseType,
    summary: listing.summary,
    priceLabel: listing.priceLabel,
    areaLabel: listing.areaLabel,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    guests: listing.guests,
    imageUrl: listing.imageUrl,
    availabilityStatus: listing.availabilityStatus,
    availableFrom: listing.availableFrom,
    coverTone: listing.coverTone
  }));
}

export async function getPlaceholderListingById(id: string): Promise<ListingDetail | null> {
  return listings.find((listing) => listing.id === id) ?? null;
}
