import type { UserRole } from "./auth";

export type AdminUserRoleEntry = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Exclude<UserRole, UserRole.GUEST>;
  commissionPercentage: number;
  createdAt: string;
};

export type AssignLandlordRoleInput = {
  email: string;
  commissionPercentage?: number;
};

export type AdminDashboardSummary = {
  totalUsers: number;
  totalLandlords: number;
  activeListings: number;
  pendingExternalRentalAlerts: number;
};
