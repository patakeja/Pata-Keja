import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types";

export type AppSupabaseServerClient = SupabaseClient<Database>;

let serviceRoleClient: AppSupabaseServerClient | null = null;

function getSupabaseServerEnvOrThrow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey
  };
}

export function getSupabaseServiceRoleClient() {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseServerEnvOrThrow();

  serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    db: {
      schema: "public"
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return serviceRoleClient;
}
