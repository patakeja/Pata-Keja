import { getSupabaseClient } from "@/lib/supabaseClient";
import { ImageService } from "@/services/storage/image.service";

export const imageService = new ImageService(getSupabaseClient);
