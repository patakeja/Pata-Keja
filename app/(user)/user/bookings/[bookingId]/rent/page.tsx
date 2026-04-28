import { redirect } from "next/navigation";

type RentPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function RentPaymentPage({ params }: RentPageProps) {
  const { bookingId } = await params;

  redirect(`/bookings/${bookingId}/rent`);
}
