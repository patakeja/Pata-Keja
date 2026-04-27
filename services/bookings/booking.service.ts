import { BOOKING_RESERVATION_WINDOW_HOURS } from "@/config/app";
import { BookingStatus, type BookingInterest, type BookingPolicy } from "@/types";

export class BookingService {
  getPolicy(): BookingPolicy {
    return {
      reservationWindowHours: BOOKING_RESERVATION_WINDOW_HOURS,
      queueStrategy: "multi_interest_queue",
      requiresPaymentForReservation: true
    };
  }

  buildQueueEntry(listingId: string, userId: string, now = new Date()): BookingInterest {
    const reservationExpiresAt = new Date(now.getTime() + BOOKING_RESERVATION_WINDOW_HOURS * 60 * 60 * 1000);

    return {
      id: `${listingId}-${userId}-${now.getTime()}`,
      listingId,
      userId,
      status: BookingStatus.PENDING,
      queuedAt: now.toISOString(),
      reservationExpiresAt: reservationExpiresAt.toISOString(),
      paymentReference: null
    };
  }
}
