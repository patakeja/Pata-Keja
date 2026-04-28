import { getSupabaseClient } from "@/lib/supabaseClient";
import { ListingService } from "@/services/listings/listing.service";

export const listingService = new ListingService(getSupabaseClient);
