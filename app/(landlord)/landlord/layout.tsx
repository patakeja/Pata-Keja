import type { ReactNode } from "react";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { landlordNavigation } from "@/config/navigation";

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      title="Landlord Dashboard"
      subtitle="Dedicated workspace for inventory, interest management, and publishing workflows."
      navigation={landlordNavigation}
    >
      {children}
    </DashboardShell>
  );
}
