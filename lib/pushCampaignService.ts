import { getSupabaseClient } from "@/lib/supabaseClient";
import { PushCampaignService } from "@/services/notifications/push-campaign.service";

export const pushCampaignService = new PushCampaignService(getSupabaseClient);
