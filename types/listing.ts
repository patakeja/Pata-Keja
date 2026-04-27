export enum ListingType {
  LONG_TERM = "long_term",
  SHORT_STAY = "short_stay"
}

export enum LocationVisibility {
  APPROXIMATE = "approximate",
  PRECISE = "precise",
  HIDDEN = "hidden"
}

export type ListingPreview = {
  id: string;
  title: string;
  type: ListingType;
  summary: string;
  priceLabel: string;
  areaLabel: string;
  bedrooms: number;
  bathrooms: number;
  guests?: number;
  coverTone: string;
};

export type ListingDetail = ListingPreview & {
  amenities: string[];
  hostLabel: string;
  availabilityLabel: string;
  locationVisibility: LocationVisibility;
  exactLocationHint: string;
};
