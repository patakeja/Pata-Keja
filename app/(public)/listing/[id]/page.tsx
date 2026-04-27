import { notFound } from "next/navigation";

import { ListingDetail } from "@/components/features/listings/listing-detail";
import { PageShell } from "@/components/ui/page-shell";
import { bookingService } from "@/lib/bookingService";
import { buildRestrictedActionRedirect } from "@/lib/auth";
import { listingService } from "@/lib/listingService";
import { RestrictedAction } from "@/types";

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

  const nextPath = `/listing/${id}`;

  return (
    <PageShell className="py-10 pb-20">
      <ListingDetail
        listing={listing}
        bookingPolicy={bookingService.getPolicy()}
        reserveHref={buildRestrictedActionRedirect(RestrictedAction.BOOK, nextPath)}
        chatHref={buildRestrictedActionRedirect(RestrictedAction.CHAT, nextPath)}
        locationHref={buildRestrictedActionRedirect(RestrictedAction.VIEW_EXACT_LOCATION, nextPath)}
      />
    </PageShell>
  );
}
