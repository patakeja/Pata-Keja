import { ProfileSummaryPanel } from "@/components/features/auth/profile-summary-panel";
import { PageShell } from "@/components/ui/page-shell";

export default function ProfilePage() {
  return (
    <PageShell className="py-3 pb-6">
      <ProfileSummaryPanel />
    </PageShell>
  );
}
