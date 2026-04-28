import { RentPaymentPanel } from "@/components/features/booking/rent-payment-panel";

type RentPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function RentPaymentPage({ params }: RentPageProps) {
  const { bookingId } = await params;

  return <RentPaymentPanel bookingId={bookingId} />;
}
