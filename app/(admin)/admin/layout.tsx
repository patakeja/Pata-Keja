import type { ReactNode } from "react";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { adminNavigation } from "@/config/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Operational controls for marketplace governance, review, and support workflows."
      navigation={adminNavigation}
    >
      {children}
    </DashboardShell>
  );
}
