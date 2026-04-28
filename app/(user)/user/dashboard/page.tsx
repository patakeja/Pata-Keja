export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function UserDashboardPage() {
  redirect("/bookings");
}
