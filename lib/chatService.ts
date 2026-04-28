import { getSupabaseClient } from "@/lib/supabaseClient";
import { ChatService } from "@/services/chat/chat.service";

export const chatService = new ChatService(getSupabaseClient);
