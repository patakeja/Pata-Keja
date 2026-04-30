import { getSupabaseClient } from "@/lib/supabaseClient";
import { NotificationService } from "@/services/notifications/notification.service";

export const notificationService = new NotificationService(getSupabaseClient);
