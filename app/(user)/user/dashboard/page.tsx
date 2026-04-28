export const dynamic = "force-dynamic";

import { BookingActivityPanel } from "@/components/features/booking/booking-activity-panel";

export default async function UserDashboardPage() {
  return <BookingActivityPanel mode="dashboard" />;
}
