const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

const serverEnv = {
  darajaConsumerKey: process.env.DARAJA_CONSUMER_KEY ?? "",
  darajaConsumerSecret: process.env.DARAJA_CONSUMER_SECRET ?? "",
  darajaShortcode: process.env.DARAJA_SHORTCODE ?? "",
  darajaPasskey: process.env.DARAJA_PASSKEY ?? "",
  darajaEnv: process.env.DARAJA_ENV ?? "sandbox",
  darajaCallbackUrl: process.env.DARAJA_CALLBACK_URL ?? ""
};

export const env = publicEnv;

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export function getSupabaseEnvOrThrow() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return publicEnv;
}

export function isDarajaConfigured() {
  return Boolean(
    serverEnv.darajaConsumerKey &&
      serverEnv.darajaConsumerSecret &&
      serverEnv.darajaShortcode &&
      serverEnv.darajaPasskey &&
      serverEnv.darajaCallbackUrl &&
      (serverEnv.darajaEnv === "sandbox" || serverEnv.darajaEnv === "production")
  );
}

export function getDarajaEnvOrThrow() {
  if (!isDarajaConfigured()) {
    throw new Error(
      "Daraja environment variables are missing. Set DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, DARAJA_PASSKEY, DARAJA_ENV, and DARAJA_CALLBACK_URL."
    );
  }

  return {
    consumerKey: serverEnv.darajaConsumerKey,
    consumerSecret: serverEnv.darajaConsumerSecret,
    shortcode: serverEnv.darajaShortcode,
    passkey: serverEnv.darajaPasskey,
    env: serverEnv.darajaEnv as "sandbox" | "production",
    callbackUrl: serverEnv.darajaCallbackUrl
  };
}
