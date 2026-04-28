import type { AuthChangeEvent, Session, SupabaseClient, User } from "@supabase/supabase-js";

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_ROLE_COOKIE_NAME,
  AUTH_STATE_COOKIE_NAME
} from "@/config/auth-session";
import { AppCapability, roleCapabilities } from "@/config/rbac";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import {
  IdentityProvider,
  RestrictedAction,
  ServiceErrorCode,
  type AccessContext,
  type AuthCallbackResult,
  type AuthenticatedUser,
  type SignInInput,
  type SignUpInput,
  type UserProfileUpdateInput,
  UserRole
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type UserProfileRow = Database["public"]["Tables"]["users"]["Row"];
type AllowedSignupRole = Exclude<UserRole, UserRole.GUEST | UserRole.ADMIN>;
type PersistedUserRole = Exclude<UserRole, UserRole.GUEST>;
type UserProfileResolution = {
  profile: UserProfileRow;
  isNewUser: boolean;
};
type AuthStateChangePayload = {
  event: AuthChangeEvent;
  session: Session | null;
  user: AuthenticatedUser | null;
  isNewUser: boolean;
};

export class AuthService {
  constructor(private readonly clientFactory?: () => ServiceClient) {}

  getGuestContext(): AccessContext {
    return {
      mode: "guest",
      role: UserRole.GUEST
    };
  }

  getAuthenticatedContext(role: PersistedUserRole): AccessContext {
    return {
      mode: "authenticated",
      role
    };
  }

  getRoleHomePath(role: PersistedUserRole) {
    if (role === UserRole.ADMIN) {
      return "/admin/dashboard";
    }

    if (role === UserRole.LANDLORD) {
      return "/landlord/dashboard";
    }

    return "/user/dashboard";
  }

  buildLoginRedirect(nextPath: string) {
    const params = new URLSearchParams({
      redirectTo: this.resolveSafeAppPath(nextPath, "/")
    });

    return `/login?${params.toString()}`;
  }

  hasCapability(context: AccessContext, capability: AppCapability) {
    return roleCapabilities[context.role].includes(capability);
  }

  canTriggerRestrictedAction(context: AccessContext, action: RestrictedAction) {
    const capabilityMap: Record<RestrictedAction, AppCapability> = {
      [RestrictedAction.BOOK]: AppCapability.CREATE_BOOKING,
      [RestrictedAction.CHAT]: AppCapability.START_CHAT,
      [RestrictedAction.VIEW_EXACT_LOCATION]: AppCapability.VIEW_EXACT_LOCATION
    };

    return this.hasCapability(context, capabilityMap[action]);
  }

  buildRestrictedActionRedirect(action: RestrictedAction, nextPath: string) {
    const params = new URLSearchParams({
      redirectTo: this.resolveSafeAppPath(nextPath, "/"),
      intent: action
    });

    return `/login?${params.toString()}`;
  }

  async signUp(
    email: string,
    password: string,
    profile: Omit<SignUpInput, "email" | "password"> = {},
    client?: ServiceClient,
    redirectToPath?: string
  ): Promise<AuthenticatedUser> {
    const supabase = this.resolveClient(client);
    const role = this.resolveSignupRole(profile.role);
    const normalizedEmail = email.trim().toLowerCase();
    const fullName = profile.fullName?.trim() || email;
    const phone = profile.phone?.trim() || null;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: this.buildAuthCallbackUrl(redirectToPath, "/"),
        data: {
          full_name: fullName,
          phone,
          role
        }
      }
    });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create account.", error);
    }

    if (!data.user) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Supabase did not return a user after sign up.");
    }

    const persistedProfile = await this.ensureUserProfile(
      data.user,
      supabase,
      fullName,
      phone,
      role
    );
    const authenticatedUser = this.mapAuthenticatedUser(data.user, persistedProfile.profile);
    this.syncAuthSnapshot(authenticatedUser);

    return authenticatedUser;
  }

  async signIn(email: string, password: string, client?: ServiceClient): Promise<AuthenticatedUser> {
    const supabase = this.resolveClient(client);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to sign in with the provided credentials.",
        error
      );
    }

    if (!data.user) {
      throw new ServiceError(ServiceErrorCode.UNAUTHENTICATED, "Supabase did not return an authenticated user.");
    }

    const persistedProfile = await this.ensureUserProfile(
      data.user,
      supabase,
      this.deriveFallbackFullName(data.user),
      this.deriveFallbackPhone(data.user),
      UserRole.TENANT
    );
    const authenticatedUser = this.mapAuthenticatedUser(data.user, persistedProfile.profile);
    this.syncAuthSnapshot(authenticatedUser);

    return authenticatedUser;
  }

  async signInWithGoogle(nextPath = "/", client?: ServiceClient): Promise<void> {
    const supabase = this.resolveClient(client);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: this.buildAuthCallbackUrl(nextPath, "/")
      }
    });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to start Google sign-in.", error);
    }
  }

  async handleAuthCallback(callbackUrl?: string, client?: ServiceClient): Promise<AuthCallbackResult> {
    const supabase = this.resolveClient(client);
    const url = this.resolveCallbackUrl(callbackUrl);
    const errorMessage = url.searchParams.get("error_description") ?? url.searchParams.get("error");

    if (errorMessage) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, decodeURIComponent(errorMessage));
    }

    const authCode = url.searchParams.get("code");

    if (authCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(authCode);

      if (error) {
        throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to complete the auth callback.", error);
      }
    }

    const session = await this.getSession(supabase);

    if (!session?.user) {
      throw new ServiceError(ServiceErrorCode.UNAUTHENTICATED, "No authenticated session was found in the callback.");
    }

    const ensuredProfile = await this.ensureUserProfile(session.user, supabase);
    const user = this.mapAuthenticatedUser(session.user, ensuredProfile.profile);
    this.syncAuthSnapshot(user);
    const requestedNextPath = this.resolveSafeAppPath(
      url.searchParams.get("redirectTo") ?? url.searchParams.get("next"),
      "/"
    );
    const isAdminMagicLinkFlow = url.searchParams.get("adminVerify") === "1";

    if (user.role === UserRole.ADMIN) {
      return {
        user,
        isNewUser: ensuredProfile.isNewUser,
        nextPath: isAdminMagicLinkFlow ? "/admin" : "/admin/verify"
      };
    }

    return {
      user,
      isNewUser: ensuredProfile.isNewUser,
      nextPath: requestedNextPath || "/"
    };
  }

  async ensureUserProfile(
    authUser: User,
    client?: ServiceClient,
    fallbackFullName?: string,
    fallbackPhone?: string | null,
    fallbackRole: PersistedUserRole = UserRole.TENANT
  ): Promise<UserProfileResolution> {
    const supabase = this.resolveClient(client);
    const resolvedFullName = fallbackFullName?.trim() || this.deriveFallbackFullName(authUser);
    const resolvedPhone =
      typeof fallbackPhone === "string" ? fallbackPhone.trim() || null : this.deriveFallbackPhone(authUser);
    const resolvedRole = fallbackRole === UserRole.ADMIN ? UserRole.TENANT : fallbackRole;
    const resolvedEmail = (authUser.email ?? "").trim().toLowerCase();
    const existingProfile = await this.getUserProfileById(supabase, authUser.id);

    if (existingProfile) {
      if (existingProfile.email !== resolvedEmail && resolvedEmail) {
        const { data, error } = await supabase
          .from("users")
          .update({
            email: resolvedEmail
          })
          .eq("id", authUser.id)
          .select("*")
          .single();

        if (error) {
          throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to synchronize the user email.", error);
        }

        return {
          profile: data,
          isNewUser: false
        };
      }

      return {
        profile: existingProfile,
        isNewUser: false
      };
    }

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          id: authUser.id,
          email: resolvedEmail,
          full_name: resolvedFullName,
          phone: resolvedPhone,
          role: resolvedRole
        },
        {
          onConflict: "id"
        }
      )
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to persist the user profile.", error);
    }

    return {
      profile: data,
      isNewUser: true
    };
  }

  async updateProfile(input: UserProfileUpdateInput, client?: ServiceClient): Promise<AuthenticatedUser> {
    const supabase = this.resolveClient(client);
    const currentUser = await this.requireCurrentUser(supabase);
    const nextFullName = input.fullName?.trim();
    const nextPhone =
      typeof input.phone === "string" ? input.phone.trim() || null : input.phone === null ? null : undefined;

    if (typeof nextFullName === "string" && !nextFullName) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Full name cannot be blank.");
    }

    const updates: Database["public"]["Tables"]["users"]["Update"] = {};

    if (typeof nextFullName === "string") {
      updates.full_name = nextFullName;
    }

    if (typeof nextPhone !== "undefined") {
      updates.phone = nextPhone;
    }

    if (Object.keys(updates).length === 0) {
      return currentUser;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to reload the authenticated user.", authError);
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", currentUser.id)
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to update the user profile.", error);
    }

    const authenticatedUser = this.mapAuthenticatedUser(authData.user, data);
    this.syncAuthSnapshot(authenticatedUser);

    return authenticatedUser;
  }

  async getSession(client?: ServiceClient): Promise<Session | null> {
    const supabase = this.resolveClient(client);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the current session.", error);
    }

    return data.session;
  }

  onAuthStateChange(
    callback: (payload: AuthStateChangePayload) => void,
    client?: ServiceClient
  ) {
    const supabase = this.resolveClient(client);
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      queueMicrotask(() => {
        void this.emitAuthStateChange(callback, event, session, supabase);
      });
    });

    return data.subscription;
  }

  async getCurrentUser(client?: ServiceClient): Promise<AuthenticatedUser | null> {
    return this.getCurrentUserWithProfile(client);
  }

  async getCurrentUserWithProfile(client?: ServiceClient): Promise<AuthenticatedUser | null> {
    const supabase = this.resolveClient(client);
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the current user.", error);
    }

    if (!data.user) {
      this.syncAuthSnapshot(null);
      return null;
    }

    const persistedProfile = await this.ensureUserProfile(data.user, supabase);
    const authenticatedUser = this.mapAuthenticatedUser(data.user, persistedProfile.profile);
    this.syncAuthSnapshot(authenticatedUser);

    return authenticatedUser;
  }

  async requireCurrentUser(client?: ServiceClient): Promise<AuthenticatedUser> {
    const user = await this.getCurrentUser(client);

    if (!user) {
      throw new ServiceError(ServiceErrorCode.UNAUTHENTICATED, "You must be signed in to perform this action.");
    }

    return user;
  }

  async requireRole(allowedRoles: PersistedUserRole[], client?: ServiceClient): Promise<AuthenticatedUser> {
    const user = await this.requireCurrentUser(client);

    if (!allowedRoles.includes(user.role)) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have permission to perform this action.");
    }

    return user;
  }

  async signOut(client?: ServiceClient): Promise<void> {
    const supabase = this.resolveClient(client);
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to sign out.", error);
    }

    this.syncAuthSnapshot(null);
  }

  async signInWithPassword(client: ServiceClient, credentials: SignInInput) {
    return this.signIn(credentials.email, credentials.password, client);
  }

  async signUpWithPassword(client: ServiceClient, payload: SignUpInput) {
    return this.signUp(payload.email, payload.password, payload, client);
  }

  async sendAdminMagicLink(email: string, client?: ServiceClient): Promise<void> {
    const supabase = this.resolveClient(client);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "An email address is required.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: this.buildAuthCallbackUrl("/admin", "/admin", {
          adminVerify: "1"
        })
      }
    });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to send the admin magic link.", error);
    }
  }

  resolveSafeAppPath(path: string | null | undefined, fallbackPath = "/") {
    if (typeof path !== "string") {
      return fallbackPath;
    }

    const trimmedPath = path.trim();

    if (!trimmedPath || !trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
      return fallbackPath;
    }

    return trimmedPath;
  }

  private resolveClient(client?: ServiceClient): ServiceClient {
    if (client) {
      return client;
    }

    if (!this.clientFactory) {
      throw new ServiceError(ServiceErrorCode.CONFIG_ERROR, "Supabase client factory is not configured.");
    }

    return this.clientFactory();
  }

  private async emitAuthStateChange(
    callback: (payload: AuthStateChangePayload) => void,
    event: AuthChangeEvent,
    session: Session | null,
    client: ServiceClient
  ) {
    if (!session?.user) {
      this.syncAuthSnapshot(null);
      callback({
        event,
        session,
        user: null,
        isNewUser: false
      });
      return;
    }

    try {
      const ensuredProfile = await this.ensureUserProfile(session.user, client);
      const authenticatedUser = this.mapAuthenticatedUser(session.user, ensuredProfile.profile);
      this.syncAuthSnapshot(authenticatedUser);

      callback({
        event,
        session,
        user: authenticatedUser,
        isNewUser: ensuredProfile.isNewUser
      });
    } catch {
      this.syncAuthSnapshot(null);
      callback({
        event,
        session,
        user: null,
        isNewUser: false
      });
    }
  }

  private async getUserProfileById(client: ServiceClient, userId: string): Promise<UserProfileRow | null> {
    const { data, error } = await client.from("users").select("*").eq("id", userId).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the user profile.", error);
    }

    return data;
  }

  private mapAuthenticatedUser(authUser: User, profile: UserProfileRow): AuthenticatedUser {
    if (!authUser.email) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Authenticated user is missing an email address.");
    }

    return {
      id: authUser.id,
      email: authUser.email,
      fullName: profile.full_name,
      phone: profile.phone,
      role: profile.role,
      provider: this.resolveIdentityProvider(authUser),
      createdAt: profile.created_at,
      lastSignInAt: authUser.last_sign_in_at ?? null
    };
  }

  private resolveSignupRole(role?: AllowedSignupRole): AllowedSignupRole {
    return role ?? UserRole.TENANT;
  }

  private resolveIdentityProvider(authUser: User) {
    const provider = authUser.app_metadata?.["provider"];

    if (provider === IdentityProvider.GOOGLE) {
      return IdentityProvider.GOOGLE;
    }

    return IdentityProvider.EMAIL;
  }

  private deriveFallbackFullName(authUser: User): string {
    const metadataFullName = authUser.user_metadata?.["full_name"];

    if (typeof metadataFullName === "string" && metadataFullName.trim()) {
      return metadataFullName.trim();
    }

    return authUser.email ?? authUser.id;
  }

  private deriveFallbackPhone(authUser: User): string | null {
    const metadataPhone = authUser.user_metadata?.["phone"];

    if (typeof metadataPhone === "string" && metadataPhone.trim()) {
      return metadataPhone.trim();
    }

    return authUser.phone ?? null;
  }

  private buildAuthCallbackUrl(
    nextPath?: string,
    fallbackPath = "/",
    extraParams?: Record<string, string>
  ) {
    if (typeof window === "undefined") {
      return undefined;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    const safeNextPath = typeof nextPath === "string" ? this.resolveSafeAppPath(nextPath, fallbackPath) : undefined;

    if (safeNextPath) {
      callbackUrl.searchParams.set("redirectTo", safeNextPath);
    }

    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        callbackUrl.searchParams.set(key, value);
      });
    }

    return callbackUrl.toString();
  }

  private resolveCallbackUrl(callbackUrl?: string) {
    if (callbackUrl) {
      return new URL(callbackUrl);
    }

    if (typeof window === "undefined") {
      throw new ServiceError(ServiceErrorCode.CONFIG_ERROR, "Auth callback URL is not available on the server.");
    }

    return new URL(window.location.href);
  }

  private syncAuthSnapshot(user: AuthenticatedUser | null) {
    if (typeof document === "undefined") {
      return;
    }

    const baseAttributes = `Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${this.getSecureCookieSuffix()}`;

    if (!user) {
      document.cookie = `${AUTH_STATE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${this.getSecureCookieSuffix()}`;
      document.cookie = `${AUTH_ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${this.getSecureCookieSuffix()}`;
      return;
    }

    document.cookie = `${AUTH_STATE_COOKIE_NAME}=1; ${baseAttributes}`;
    document.cookie = `${AUTH_ROLE_COOKIE_NAME}=${encodeURIComponent(user.role)}; ${baseAttributes}`;
  }

  private getSecureCookieSuffix() {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return "; Secure";
    }

    return "";
  }
}
