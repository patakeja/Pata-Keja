import { redirect } from "next/navigation";

type LegacyBookingDetailPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function LegacyBookingDetailPage({ params }: LegacyBookingDetailPageProps) {
  const { bookingId } = await params;

  redirect(`/bookings/${bookingId}`);
}
