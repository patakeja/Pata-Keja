import type { SupabaseClient } from "@supabase/supabase-js";

import { AppCapability, roleCapabilities } from "@/config/rbac";
import {
  RestrictedAction,
  type AccessContext,
  type SignInInput,
  type SignUpInput,
  UserRole
} from "@/types";

export class AuthService {
  getGuestContext(): AccessContext {
    return {
      mode: "guest",
      role: UserRole.GUEST
    };
  }

  getAuthenticatedContext(role: Exclude<UserRole, UserRole.GUEST>): AccessContext {
    return {
      mode: "authenticated",
      role
    };
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
      next: nextPath,
      intent: action
    });

    return `/login?${params.toString()}`;
  }

  async signInWithPassword(client: SupabaseClient, credentials: SignInInput) {
    return client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
  }

  async signUpWithPassword(client: SupabaseClient, payload: SignUpInput) {
    return client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName
        }
      }
    });
  }
}
