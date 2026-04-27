import { UserRole } from "@/types";

export enum AppCapability {
  BROWSE_LISTINGS = "browse_listings",
  VIEW_EXACT_LOCATION = "view_exact_location",
  CREATE_BOOKING = "create_booking",
  START_CHAT = "start_chat",
  MANAGE_OWN_BOOKINGS = "manage_own_bookings",
  MANAGE_LISTINGS = "manage_listings",
  VIEW_INTEREST_QUEUE = "view_interest_queue",
  ACCESS_ADMIN = "access_admin"
}

export const roleCapabilities: Record<UserRole, AppCapability[]> = {
  [UserRole.GUEST]: [AppCapability.BROWSE_LISTINGS],
  [UserRole.RENTER]: [
    AppCapability.BROWSE_LISTINGS,
    AppCapability.VIEW_EXACT_LOCATION,
    AppCapability.CREATE_BOOKING,
    AppCapability.START_CHAT,
    AppCapability.MANAGE_OWN_BOOKINGS
  ],
  [UserRole.LANDLORD]: [
    AppCapability.BROWSE_LISTINGS,
    AppCapability.VIEW_EXACT_LOCATION,
    AppCapability.CREATE_BOOKING,
    AppCapability.START_CHAT,
    AppCapability.MANAGE_OWN_BOOKINGS,
    AppCapability.MANAGE_LISTINGS,
    AppCapability.VIEW_INTEREST_QUEUE
  ],
  [UserRole.ADMIN]: [
    AppCapability.BROWSE_LISTINGS,
    AppCapability.VIEW_EXACT_LOCATION,
    AppCapability.CREATE_BOOKING,
    AppCapability.START_CHAT,
    AppCapability.MANAGE_OWN_BOOKINGS,
    AppCapability.MANAGE_LISTINGS,
    AppCapability.VIEW_INTEREST_QUEUE,
    AppCapability.ACCESS_ADMIN
  ]
};
