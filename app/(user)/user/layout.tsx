import type { ReactNode } from "react";

import { AuthGuard } from "@/components/features/auth/auth-guard";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { userNavigation } from "@/config/navigation";
import { UserRole } from "@/types";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={[UserRole.TENANT, UserRole.LANDLORD, UserRole.ADMIN]}>
      <DashboardShell
        title="My Account"
        subtitle="Your bookings, saved activity, and personal settings in one place."
        navigation={userNavigation}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
