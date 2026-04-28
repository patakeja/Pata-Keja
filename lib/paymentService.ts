import { getSupabaseClient } from "@/lib/supabaseClient";
import { PaymentService } from "@/services/payments/payment.service";

export const paymentService = new PaymentService(getSupabaseClient);
