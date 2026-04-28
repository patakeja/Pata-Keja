import type { UserRole } from "./auth";
import type { HouseType, ListingType } from "./listing";
import type { PaymentStatus } from "./payment";

export enum BookingStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  COMPLETED = "completed"
}

export type BookingInterest = {
  id: string;
  listingId: string;
  userId: string;
  status: BookingStatus;
  queuedAt: string;
  reservationExpiresAt: string | null;
  paymentReference: string | null;
};

export type BookingPolicy = {
  reservationWindowHours: number;
  queueStrategy: "multi_interest_queue";
  requiresPaymentForReservation: boolean;
};

export type ReservationQuote = {
  depositAmount: number;
  holdDurationHours: number;
  refundExplanation: string;
};

export type BookingRecord = {
  id: string;
  userId: string;
  listingId: string;
  status: BookingStatus;
  depositAmount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingInput = {
  listingId: string;
  userId?: string;
};

export type BookingPaymentSummary = {
  depositPaymentId: string | null;
  depositPaymentStatus: PaymentStatus | null;
  depositPaidAmount: number;
  refundAmount: number;
  remainingRentAmount: number;
  rentPaymentId: string | null;
  rentPaymentStatus: PaymentStatus | null;
  canPayRent: boolean;
};

export type UserBooking = BookingRecord & {
  listing: {
    id: string;
    title: string;
    price: number;
    listingType: ListingType;
    houseType: HouseType;
    areaName: string;
    townName: string;
    countyName: string;
    depositAmount: number;
    holdDurationHours: number;
    maxActiveBookings: number;
    totalUnits: number;
    isActive: boolean;
    isVerified: boolean;
  };
  paymentSummary: BookingPaymentSummary;
};

export type BookingDetail = UserBooking & {
  listing: UserBooking["listing"] & {
    description: string;
    availableFrom: string | null;
    mapsLink: string | null;
    latitude: number | null;
    longitude: number | null;
    imagePaths: string[];
    imageUrls: string[];
    landlordName: string | null;
  };
};

export type ListingBooking = BookingRecord & {
  user: {
    id: string;
    fullName: string;
    phone: string | null;
    role: Exclude<UserRole, UserRole.GUEST>;
  };
};
