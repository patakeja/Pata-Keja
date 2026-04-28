import { RentPaymentPanel } from "@/components/features/booking/rent-payment-panel";
import { PageShell } from "@/components/ui/page-shell";

type RentPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function RentPaymentPage({ params }: RentPageProps) {
  const { bookingId } = await params;

  return (
    <PageShell className="py-3 pb-6">
      <RentPaymentPanel bookingId={bookingId} />
    </PageShell>
  );
}
