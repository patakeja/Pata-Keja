import Link from "next/link";

import { HouseTypeChips } from "@/components/features/listings/house-type-chips";
import { ListingRail } from "@/components/features/listings/listing-rail";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { listingService } from "@/lib/listingService";
import { ListingType } from "@/types";

export async function HomePageContent() {
  const listings = await listingService.getPublicListings({ limit: 12 });
  const rentListings = listings.filter((listing) => listing.type === ListingType.LONG_TERM).slice(0, 8);
  const shortStayListings = listings.filter((listing) => listing.type === ListingType.SHORT_STAY).slice(0, 8);

  return (
    <PageShell className="space-y-4 py-3 pb-6">
      <Card>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight text-foreground">Find houses fast</h1>
            <p className="text-xs text-muted-foreground">
              Browse long-term rentals and short stays with a compact, fast-scanning layout.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Rent</p>
              <p className="mt-1 font-semibold text-foreground">{rentListings.length}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Short Stay</p>
              <p className="mt-1 font-semibold text-foreground">{shortStayListings.length}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">All Houses</p>
              <p className="mt-1 font-semibold text-foreground">{listings.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ListingRail title="Rent" href="/houses?type=long_term" listings={rentListings} />
      <ListingRail title="Short Stay" href="/houses?type=short_stay" listings={shortStayListings} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Categories</h2>
        <HouseTypeChips />
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">All Houses</h2>
            <p className="text-xs text-muted-foreground">
              Open the full houses page to browse the complete catalog with filters and search.
            </p>
          </div>
          <Link href="/houses" className={buttonVariants({ size: "lg" })}>
            Browse all houses
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  );
}
