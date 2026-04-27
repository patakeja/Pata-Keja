import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnvOrThrow, isSupabaseConfigured } from "@/config/env";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvOrThrow();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }

  return browserClient;
}

export { isSupabaseConfigured };
