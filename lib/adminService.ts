import { getSupabaseClient } from "@/lib/supabaseClient";
import { AdminService } from "@/services/admin/admin.service";

export const adminService = new AdminService(getSupabaseClient);
