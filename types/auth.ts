export enum UserRole {
  GUEST = "guest",
  TENANT = "tenant",
  LANDLORD = "landlord",
  ADMIN = "admin"
}

export enum IdentityProvider {
  EMAIL = "email",
  GOOGLE = "google"
}

export type AuthMode = "guest" | "authenticated";

export type AccessContext = {
  mode: AuthMode;
  role: UserRole;
};

export enum RestrictedAction {
  BOOK = "book",
  CHAT = "chat",
  VIEW_EXACT_LOCATION = "view_exact_location"
}

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName?: string;
  phone?: string | null;
  role?: Exclude<UserRole, UserRole.GUEST | UserRole.ADMIN>;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Exclude<UserRole, UserRole.GUEST>;
  provider: IdentityProvider;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AuthCallbackResult = {
  user: AuthenticatedUser;
  isNewUser: boolean;
  nextPath: string;
};

export type UserProfileUpdateInput = {
  fullName?: string;
  phone?: string | null;
};
