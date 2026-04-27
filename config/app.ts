import { BookingStatus, ListingType } from "@/types";

export const APP_NAME = "Pata Keja";
export const APP_TAGLINE = "Flexible real estate infrastructure for rentals, short stays, and reservations.";
export const BOOKING_RESERVATION_WINDOW_HOURS = 72;

export const SUPPORTED_LISTING_TYPES = [
  ListingType.LONG_TERM,
  ListingType.SHORT_STAY
] as const;

export const SUPPORTED_BOOKING_STATUSES = [
  BookingStatus.IDLE,
  BookingStatus.PENDING,
  BookingStatus.RESERVED,
  BookingStatus.EXPIRED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED
] as const;
