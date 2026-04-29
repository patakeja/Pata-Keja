export type NavigationItem = {
  href: string;
  label: string;
  description?: string;
};

export const publicNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/houses", label: "Houses" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign Up" }
];

export const userNavigation: NavigationItem[] = [
  { href: "/bookings", label: "Bookings", description: "Reservation activity and history" },
  { href: "/profile", label: "Profile", description: "Account settings" }
];

export const landlordNavigation: NavigationItem[] = [
  { href: "/landlord/dashboard", label: "Dashboard", description: "Portfolio snapshot and booking activity" },
  { href: "/landlord/listings", label: "My Houses", description: "Manage availability, images, and rentals" },
  { href: "/landlord/chats", label: "Chats", description: "Booking conversations with tenants" }
];

export const adminNavigation: NavigationItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", description: "Marketplace operations overview" },
  { href: "/admin/listings", label: "Houses", description: "Listing review and inventory control" },
  { href: "/admin/locations", label: "Locations", description: "Counties, towns, and area setup" },
  { href: "/admin/chats", label: "Chats", description: "Read-only booking conversations" },
  { href: "/admin/landlords", label: "Landlords", description: "Access control and commission settings" },
  { href: "/admin/featured", label: "Featured", description: "Homepage curation and spotlight control" },
  { href: "/admin/finances", label: "Finances", description: "Refund settings and payment policy" },
  { href: "/admin/analytics", label: "Analytics", description: "Area, demand, and marketplace trends" }
];
