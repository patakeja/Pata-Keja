import { getSupabaseClient } from "@/lib/supabaseClient";
import { BookingService } from "@/services/bookings/booking.service";

export const bookingService = new BookingService(getSupabaseClient);
