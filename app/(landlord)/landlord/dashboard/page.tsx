import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function LandlordDashboardPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PlaceholderPanel
        title="Portfolio snapshot"
        description="Publishing metrics, listing health, and inquiry volume will surface here."
        hint="Keep landlord analytics in dedicated services so future dashboards do not leak business logic into cards."
      />
      <PlaceholderPanel
        title="Interested users queue"
        description="The booking foundation is already modeled for multi-user interest queues instead of a single-lock reservation approach."
        hint="Queue inspection should later use booking and landlord services backed by Supabase tables."
      />
    </div>
  );
}
