import { getSupabaseClient } from "@/lib/supabaseClient";
import { LandlordService } from "@/services/landlords/landlord.service";

export const landlordService = new LandlordService(getSupabaseClient);
