export type NavigationItem = {
  href: string;
  label: string;
  description?: string;
};

export const publicNavigation: NavigationItem[] = [
  { href: "/home", label: "Home" },
  { href: "/listings", label: "Listings" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign Up" }
];

export const userNavigation: NavigationItem[] = [
  { href: "/user/dashboard", label: "Overview", description: "Profile and account activity" },
  { href: "/user/bookings", label: "Bookings", description: "Reservation activity and history" },
  { href: "/user/profile", label: "Profile", description: "Identity and preference settings" }
];

export const landlordNavigation: NavigationItem[] = [
  { href: "/landlord/dashboard", label: "Overview", description: "Portfolio snapshot and performance" },
  { href: "/landlord/listings", label: "Listings", description: "Manage property inventory" },
  { href: "/landlord/create-listing", label: "Create Listing", description: "Draft and publish a new listing" }
];

export const adminNavigation: NavigationItem[] = [
  { href: "/admin/dashboard", label: "Overview", description: "Marketplace operations overview" },
  { href: "/admin/users", label: "Users", description: "User directory and moderation" },
  { href: "/admin/listings", label: "Listings", description: "Listing review and curation" },
  { href: "/admin/bookings", label: "Bookings", description: "Booking queue and disputes" }
];
