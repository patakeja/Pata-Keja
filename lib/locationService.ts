import { getSupabaseClient } from "@/lib/supabaseClient";
import { LocationService } from "@/services/locations/location.service";

export const locationService = new LocationService(getSupabaseClient);
