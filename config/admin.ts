function parseAdminWhitelist() {
  const rawWhitelist = process.env.NEXT_PUBLIC_ADMIN_WHITELIST_EMAILS ?? "";

  return rawWhitelist
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const ADMIN_WHITELIST_EMAILS = parseAdminWhitelist();

export function isWhitelistedAdminEmail(email: string) {
  return ADMIN_WHITELIST_EMAILS.includes(email.trim().toLowerCase());
}
