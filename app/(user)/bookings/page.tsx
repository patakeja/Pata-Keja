export const dynamic = "force-dynamic";

import { BookingActivityPanel } from "@/components/features/booking/booking-activity-panel";
import { PageShell } from "@/components/ui/page-shell";

export default function BookingsPage() {
  return (
    <PageShell className="py-3 pb-6">
      <BookingActivityPanel />
    </PageShell>
  );
}
