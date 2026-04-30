import { PushCampaignReachType } from "@/types";

export const NOTIFICATION_PAGE_SIZE = 50;
export const MESSAGE_REMINDER_DELAY_HOURS = 6;
export const BOOKING_EXPIRY_REMINDER_HOURS = 24;

export const PUSH_CAMPAIGN_CPM: Record<PushCampaignReachType, number> = {
  [PushCampaignReachType.AREA]: 0.5,
  [PushCampaignReachType.TOWN]: 1.0,
  [PushCampaignReachType.COUNTY]: 2.0
};
