import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function UserDashboardPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PlaceholderPanel
        title="Account overview"
        description="Profile completion, booking history, and recommendation modules will plug into this area."
        hint="This route is scaffolded and ready for authenticated data loading."
      />
      <PlaceholderPanel
        title="Upcoming actions"
        description="Reservation reminders, saved searches, and guest prompts will live here."
        hint="Role-aware content should be fetched through services, not directly in UI components."
      />
    </div>
  );
}
