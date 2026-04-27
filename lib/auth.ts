import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { AuthService } from "@/services/auth/auth.service";
import { RestrictedAction, type AccessContext, type SignInInput, type SignUpInput, UserRole } from "@/types";

const authService = new AuthService();

export async function signInWithPassword(credentials: SignInInput) {
  return authService.signInWithPassword(getSupabaseBrowserClient(), credentials);
}

export async function signUpWithPassword(payload: SignUpInput) {
  return authService.signUpWithPassword(getSupabaseBrowserClient(), payload);
}

export function getGuestAccessContext() {
  return authService.getGuestContext();
}

export function getAuthenticatedAccessContext(role: Exclude<UserRole, UserRole.GUEST>) {
  return authService.getAuthenticatedContext(role);
}

export function canTriggerRestrictedAction(context: AccessContext, action: RestrictedAction) {
  return authService.canTriggerRestrictedAction(context, action);
}

export function buildRestrictedActionRedirect(action: RestrictedAction, nextPath: string) {
  return authService.buildRestrictedActionRedirect(action, nextPath);
}

export { authService };
