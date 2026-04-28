import { BookingStatus, ListingType } from "@/types";

export const APP_NAME = "Pata Keja";
export const APP_TAGLINE = "Flexible real estate infrastructure for rentals, short stays, and reservations.";
export const DEFAULT_BOOKING_HOLD_DURATION_HOURS = 72;
export const BOOKING_RESERVATION_WINDOW_HOURS = DEFAULT_BOOKING_HOLD_DURATION_HOURS;
export const DEFAULT_LISTING_TOTAL_UNITS = 1;
export const DEFAULT_MAX_ACTIVE_BOOKINGS = 1;
export const DEFAULT_LANDLORD_COMMISSION_PERCENTAGE = 0;

export const SUPPORTED_LISTING_TYPES = [
  ListingType.LONG_TERM,
  ListingType.SHORT_STAY
] as const;

export const SUPPORTED_BOOKING_STATUSES = [
  BookingStatus.ACTIVE,
  BookingStatus.EXPIRED,
  BookingStatus.COMPLETED
] as const;
