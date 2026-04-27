import type { ReactNode } from "react";

import { DashboardShell } from "@/components/ui/dashboard-shell";
import { userNavigation } from "@/config/navigation";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      title="User Dashboard"
      subtitle="Reserved for authenticated renters and future profile-aware workflows."
      navigation={userNavigation}
    >
      {children}
    </DashboardShell>
  );
}
