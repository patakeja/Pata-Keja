import { HouseType, ListingType } from "@/types";

type HouseTypePresentation = {
  bedrooms: number;
  bathrooms: number;
  guests?: number;
  coverTone: string;
};

export const houseTypePresentation: Record<HouseType, HouseTypePresentation> = {
  [HouseType.SINGLE_ROOM]: {
    bedrooms: 1,
    bathrooms: 1,
    coverTone: "from-amber-200 via-orange-100 to-white"
  },
  [HouseType.BEDSITTER]: {
    bedrooms: 1,
    bathrooms: 1,
    guests: 1,
    coverTone: "from-rose-200 via-orange-100 to-white"
  },
  [HouseType.STUDIO]: {
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    coverTone: "from-emerald-200 via-teal-100 to-white"
  },
  [HouseType.ONE_BEDROOM]: {
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    coverTone: "from-lime-200 via-emerald-100 to-white"
  },
  [HouseType.TWO_BEDROOM]: {
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    coverTone: "from-sky-200 via-cyan-100 to-white"
  },
  [HouseType.THREE_BEDROOM]: {
    bedrooms: 3,
    bathrooms: 3,
    guests: 6,
    coverTone: "from-cyan-200 via-sky-100 to-white"
  },
  [HouseType.FOUR_BEDROOM]: {
    bedrooms: 4,
    bathrooms: 4,
    guests: 8,
    coverTone: "from-indigo-200 via-blue-100 to-white"
  },
  [HouseType.FIVE_BEDROOM_PLUS]: {
    bedrooms: 5,
    bathrooms: 5,
    guests: 10,
    coverTone: "from-violet-200 via-fuchsia-100 to-white"
  },
  [HouseType.MAISONETTE]: {
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    coverTone: "from-yellow-200 via-amber-100 to-white"
  },
  [HouseType.TOWNHOUSE]: {
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    coverTone: "from-orange-200 via-amber-100 to-white"
  },
  [HouseType.BUNGALOW]: {
    bedrooms: 3,
    bathrooms: 2,
    guests: 6,
    coverTone: "from-green-200 via-lime-100 to-white"
  },
  [HouseType.VILLA]: {
    bedrooms: 5,
    bathrooms: 4,
    guests: 10,
    coverTone: "from-blue-200 via-indigo-100 to-white"
  },
  [HouseType.APARTMENT]: {
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    coverTone: "from-stone-200 via-slate-100 to-white"
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
