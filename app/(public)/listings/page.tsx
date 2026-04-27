import { ListingGrid } from "@/components/features/listings/listing-grid";
import { PageShell } from "@/components/ui/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { listingService } from "@/lib/listingService";

export default async function ListingsPage() {
  const listings = await listingService.getPublicListings();

  return (
    <PageShell className="space-y-10 py-10 pb-20">
      <SectionHeading
        eyebrow="Listings"
        title="Public inventory browsing"
        description="The marketplace is scaffolded with a basic grid and feature-layered components, ready to switch from placeholder data to Supabase-backed queries."
      />
      <ListingGrid listings={listings} />
    </PageShell>
  );
}
