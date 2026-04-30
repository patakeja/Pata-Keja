export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/features/auth/auth-guard";
import { NotificationCenterPanel } from "@/components/features/notifications/notification-center-panel";
import { PageShell } from "@/components/ui/page-shell";
import { UserRole } from "@/types";

export default function NotificationsPage() {
  return (
    <AuthGuard allowedRoles={[UserRole.TENANT, UserRole.LANDLORD, UserRole.ADMIN]}>
      <PageShell className="py-3 pb-6">
        <NotificationCenterPanel />
      </PageShell>
    </AuthGuard>
  );
}
