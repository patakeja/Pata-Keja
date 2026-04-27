export enum BookingStatus {
  IDLE = "idle",
  PENDING = "pending",
  RESERVED = "reserved",
  EXPIRED = "expired",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
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
