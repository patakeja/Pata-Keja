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
    summary: "Structured placeholder inventory for long-term rental flows.",
    priceLabel: "From KES 68,000 / month",
    areaLabel: "Approximate area visible before sign-in",
    bedrooms: 2,
    bathrooms: 2,
    imageUrl: null,
    availabilityStatus: ListingAvailabilityStatus.AVAILABLE,
    availableFrom: null,
    coverTone: "from-amber-200 via-orange-100 to-white",
    amenities: ["Balcony", "Backup water", "Parking"],
    hostLabel: "Managed by landlord workspace",
    availabilityLabel: "Availability sync will connect to Supabase next",
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
    summary: "Short-stay placeholder with booking and reservation hooks.",
    priceLabel: "From KES 6,500 / night",
    areaLabel: "Approximate area visible before sign-in",
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    imageUrl: null,
    availabilityStatus: ListingAvailabilityStatus.COMING_SOON,
    availableFrom: "2026-05-15",
    coverTone: "from-emerald-200 via-teal-100 to-white",
    amenities: ["Self check-in", "Wi-Fi", "Workspace"],
    hostLabel: "Managed by landlord workspace",
    availabilityLabel: "Reservation inventory will be powered by booking states.",
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
    summary: "Spacious placeholder listing for landlord and admin workflows.",
    priceLabel: "From KES 120,000 / month",
    areaLabel: "Approximate area visible before sign-in",
    bedrooms: 3,
    bathrooms: 3,
    imageUrl: null,
    availabilityStatus: ListingAvailabilityStatus.AVAILABLE,
    availableFrom: null,
    coverTone: "from-sky-200 via-cyan-100 to-white",
    amenities: ["Private garden", "Pet friendly", "Storage room"],
    hostLabel: "Managed by landlord workspace",
    availabilityLabel: "Interest queue support is scaffolded in the booking service.",
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
