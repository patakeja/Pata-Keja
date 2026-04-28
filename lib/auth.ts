import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { AuthService } from "@/services/auth/auth.service";
import {
  RestrictedAction,
  type AccessContext,
  type AuthCallbackResult,
  type AuthenticatedUser,
  type SignInInput,
  type SignUpInput,
  type UserEmailUpdateInput,
  type UserPasswordUpdateInput,
  type UserProfileUpdateInput,
  UserRole
} from "@/types";

const authService = new AuthService(getSupabaseClient);

export async function signUp(payload: SignUpInput, redirectTo?: string) {
  return authService.signUp(payload.email, payload.password, payload, undefined, redirectTo);
}

export async function signIn(credentials: SignInInput) {
  return authService.signIn(credentials.email, credentials.password);
}

export async function signInWithGoogle(nextPath?: string) {
  return authService.signInWithGoogle(nextPath);
}

export async function sendAdminMagicLink(email: string) {
  return authService.sendAdminMagicLink(email);
}

export async function handleAuthCallback(callbackUrl?: string): Promise<AuthCallbackResult> {
  return authService.handleAuthCallback(callbackUrl);
}

export async function getCurrentUser() {
  return authService.getCurrentUser();
}

export async function getCurrentUserWithProfile() {
  return authService.getCurrentUserWithProfile();
}

export async function updateProfile(input: UserProfileUpdateInput): Promise<AuthenticatedUser> {
  return authService.updateProfile(input);
}

export async function updateEmail(input: UserEmailUpdateInput): Promise<AuthenticatedUser> {
  return authService.updateEmail(input);
}

export async function updatePassword(input: UserPasswordUpdateInput): Promise<void> {
  return authService.updatePassword(input);
}

export async function getSession(): Promise<Session | null> {
  return authService.getSession();
}

export function onAuthStateChange(
  callback: (payload: {
    event: AuthChangeEvent;
    session: Session | null;
    user: AuthenticatedUser | null;
    isNewUser: boolean;
  }) => void
) {
  return authService.onAuthStateChange(callback);
}

export async function signOut() {
  return authService.signOut();
}

export async function signInWithPassword(credentials: SignInInput) {
  return signIn(credentials);
}

export async function signUpWithPassword(payload: SignUpInput) {
  return signUp(payload);
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

export function buildLoginRedirect(nextPath: string) {
  return authService.buildLoginRedirect(nextPath);
}

export function getRoleHomePath(role: Exclude<UserRole, UserRole.GUEST>) {
  return authService.getRoleHomePath(role);
}

export function resolveSafeAppPath(path: string | null | undefined, fallbackPath?: string) {
  return authService.resolveSafeAppPath(path, fallbackPath);
}

export { authService };
