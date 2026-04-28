import type { ReactNode } from "react";

import { AuthGuard } from "@/components/features/auth/auth-guard";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { landlordNavigation } from "@/config/navigation";
import { UserRole } from "@/types";

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={[UserRole.LANDLORD, UserRole.ADMIN]}>
      <DashboardShell
        title="Landlord Dashboard"
        subtitle="Inventory, booking queue, and rental control for your houses."
        navigation={landlordNavigation}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
