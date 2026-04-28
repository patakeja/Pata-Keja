import { notFound } from "next/navigation";

import { ListingDetail } from "@/components/features/listings/listing-detail";
import { PageShell } from "@/components/ui/page-shell";
import { bookingService } from "@/lib/bookingService";
import { listingService } from "@/lib/listingService";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const listing = await listingService.getPublicListingById(id);

  if (!listing) {
    notFound();
  }

  return (
    <PageShell className="py-3 pb-6">
      <ListingDetail listing={listing} bookingPolicy={bookingService.getPolicy()} />
    </PageShell>
  );
}
