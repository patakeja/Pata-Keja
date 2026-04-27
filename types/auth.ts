export enum UserRole {
  GUEST = "guest",
  RENTER = "renter",
  LANDLORD = "landlord",
  ADMIN = "admin"
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
  fullName: string;
};
