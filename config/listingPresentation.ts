import { HouseType, ListingType } from "@/types";

type HouseTypePresentation = {
  bedrooms: number;
  bathrooms: number;
  guests?: number;
  coverTone: string;
};

const emeraldTone = "from-emerald-200 via-emerald-50 to-white";
const goldTone = "from-[#E7D4BC] via-[#FBF6EF] to-white";
const mixedTone = "from-[#D7F3E5] via-[#F8F1E8] to-white";

export const houseTypePresentation: Record<HouseType, HouseTypePresentation> = {
  [HouseType.SINGLE_ROOM]: {
    bedrooms: 1,
    bathrooms: 1,
    coverTone: goldTone
  },
  [HouseType.BEDSITTER]: {
    bedrooms: 1,
    bathrooms: 1,
    guests: 1,
    coverTone: mixedTone
  },
  [HouseType.STUDIO]: {
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    coverTone: emeraldTone
  },
  [HouseType.ONE_BEDROOM]: {
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    coverTone: emeraldTone
  },
  [HouseType.TWO_BEDROOM]: {
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    coverTone: mixedTone
  },
  [HouseType.THREE_BEDROOM]: {
    bedrooms: 3,
    bathrooms: 3,
    guests: 6,
    coverTone: emeraldTone
  },
  [HouseType.FOUR_BEDROOM]: {
    bedrooms: 4,
    bathrooms: 4,
    guests: 8,
    coverTone: goldTone
  },
  [HouseType.FIVE_BEDROOM_PLUS]: {
    bedrooms: 5,
    bathrooms: 5,
    guests: 10,
    coverTone: mixedTone
  },
  [HouseType.MAISONETTE]: {
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    coverTone: goldTone
  },
  [HouseType.TOWNHOUSE]: {
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    coverTone: mixedTone
  },
  [HouseType.BUNGALOW]: {
    bedrooms: 3,
    bathrooms: 2,
    guests: 6,
    coverTone: emeraldTone
  },
  [HouseType.VILLA]: {
    bedrooms: 5,
    bathrooms: 4,
    guests: 10,
    coverTone: goldTone
  },
  [HouseType.APARTMENT]: {
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    coverTone: mixedTone
  }
};

export const listingTypeLabels: Record<ListingType, string> = {
  [ListingType.LONG_TERM]: "Rent",
  [ListingType.SHORT_STAY]: "Short Stay"
};

export const houseTypeLabels: Record<HouseType, string> = {
  [HouseType.SINGLE_ROOM]: "Single Room",
  [HouseType.BEDSITTER]: "Bedsitter",
  [HouseType.STUDIO]: "Studio",
  [HouseType.ONE_BEDROOM]: "1 Bedroom",
  [HouseType.TWO_BEDROOM]: "2 Bedroom",
  [HouseType.THREE_BEDROOM]: "3 Bedroom",
  [HouseType.FOUR_BEDROOM]: "4 Bedroom",
  [HouseType.FIVE_BEDROOM_PLUS]: "5+ Bedroom",
  [HouseType.MAISONETTE]: "Maisonette",
  [HouseType.TOWNHOUSE]: "Townhouse",
  [HouseType.BUNGALOW]: "Bungalow",
  [HouseType.VILLA]: "Villa",
  [HouseType.APARTMENT]: "Apartment"
};

export const primaryHouseTypeFilters = [
  HouseType.SINGLE_ROOM,
  HouseType.BEDSITTER,
  HouseType.ONE_BEDROOM,
  HouseType.TWO_BEDROOM,
  HouseType.THREE_BEDROOM
] as const;
