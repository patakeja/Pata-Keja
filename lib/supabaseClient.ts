import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnvOrThrow, isSupabaseConfigured } from "@/config/env";
import type { Database } from "@/types";

export type AppSupabaseClient = SupabaseClient<Database>;

let browserClient: AppSupabaseClient | null = null;

export function createSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvOrThrow();
  const isBrowser = typeof window !== "undefined";

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: "public"
    },
    auth: {
      autoRefreshToken: isBrowser,
      persistSession: isBrowser,
      detectSessionInUrl: isBrowser
    }
  });
}

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    return createSupabaseClient();
  }

  if (!browserClient) {
    browserClient = createSupabaseClient();
  }

  return browserClient;
}

export const createSupabaseBrowserClient = createSupabaseClient;
export const getSupabaseBrowserClient = getSupabaseClient;

export { isSupabaseConfigured };
