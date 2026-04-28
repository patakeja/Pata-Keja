import type { ReactNode } from "react";

import { AuthGuard } from "@/components/features/auth/auth-guard";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { adminNavigation } from "@/config/navigation";
import { UserRole } from "@/types";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={[UserRole.ADMIN]}>
      <DashboardShell
        title="Admin Workspace"
        subtitle="Compact operations hub for houses, landlords, finance policy, and marketplace oversight."
        navigation={adminNavigation}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
