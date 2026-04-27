import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function AdminDashboardPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PlaceholderPanel
        title="Platform health"
        description="Operational metrics, escalation queues, and audit surfaces will live in this admin workspace."
        hint="Admin-only data access should be centralized through RBAC-aware service methods."
      />
      <PlaceholderPanel
        title="Review queue"
        description="Listing review, dispute handling, and moderation pipelines can be layered on this route group."
        hint="This separation keeps admin concerns isolated from landlord and renter flows."
      />
    </div>
  );
}
