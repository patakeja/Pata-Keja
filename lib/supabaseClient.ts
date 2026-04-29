import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnvOrThrow, isSupabaseConfigured } from "@/config/env";
import type { Database } from "@/types";

export type AppSupabaseClient = SupabaseClient<Database>;
type SupabaseClientOptions = {
  accessToken?: string;
};

let browserClient: AppSupabaseClient | null = null;

export function createSupabaseClient(options?: SupabaseClientOptions) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvOrThrow();
  const isBrowser = typeof window !== "undefined";
  const normalizedAccessToken = options?.accessToken?.trim();

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: "public"
    },
    global: normalizedAccessToken
      ? {
          headers: {
            Authorization: `Bearer ${normalizedAccessToken}`
          }
        }
      : undefined,
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
