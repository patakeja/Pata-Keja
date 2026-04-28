import { DepositCheckoutPanel } from "@/components/features/booking/deposit-checkout-panel";
import { PageShell } from "@/components/ui/page-shell";

type DepositPageProps = {
  params: Promise<{
    listingId: string;
  }>;
};

export default async function DepositPage({ params }: DepositPageProps) {
  const { listingId } = await params;

  return (
    <PageShell className="py-3 pb-6">
      <DepositCheckoutPanel listingId={listingId} />
    </PageShell>
  );
}
