import { Suspense } from "react";
import Link from "next/link";

import { APP_NAME } from "@/config/app";
import { HouseTypeChips } from "@/components/features/listings/house-type-chips";
import { ListingRail } from "@/components/features/listings/listing-rail";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { listingService } from "@/lib/listingService";
import { ListingType } from "@/types";

export async function HomePageContent() {
  const listings = await listingService.getPublicListings({ limit: 12 });
  const rentListings = listings.filter((listing) => listing.type === ListingType.LONG_TERM).slice(0, 8);
  const shortStayListings = listings.filter((listing) => listing.type === ListingType.SHORT_STAY).slice(0, 8);
  const spotlightItems = [
    "Location-based alerts keep you close to the neighborhoods you prefer.",
    "Bookings, payments, and chat stay in one clean renter flow.",
    "Short stays and long-term homes live in the same fast catalog."
  ];

  return (
    <PageShell className="space-y-5 py-4 pb-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_340px]">
        <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.98))]">
          <CardContent className="relative space-y-6 p-6 sm:p-8">
            <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

            <div className="relative space-y-4">
              <Badge className="w-fit">Fresh Look</Badge>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{APP_NAME}</p>
                <h1 className="max-w-2xl font-[family:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Find, compare, and book houses near you without the usual friction.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {APP_NAME} makes it easier to browse rentals and short stays, reserve faster, and stay updated on the
                  places that match your area preferences.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/houses" className={buttonVariants({ size: "lg" })}>
                  Browse houses
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Create account
                </Link>
              </div>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Rent homes</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{rentListings.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Ready to compare long-term options</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Short stays</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{shortStayListings.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Flexible stays in one place</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Live catalog</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{listings.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Homes ready to explore today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/92">
          <CardContent className="space-y-4 p-5">
            <Badge className="w-fit">Why {APP_NAME}</Badge>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">A calmer way to house-hunt</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Clean search, location-aware notifications, and faster booking flows keep the experience focused from first
                browse to payment.
              </p>
            </div>
            <div className="space-y-3">
              {spotlightItems.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-border/70 bg-background/60 p-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-foreground">
                    0{index + 1}
                  </span>
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>
            <Link href="/notifications" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
              Explore alerts
            </Link>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Browse by house type</h2>
            <p className="text-sm text-muted-foreground">
              Start with the categories renters reach for most often, then open the full catalog when you want more control.
            </p>
          </div>
          <Link href="/houses" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Open full catalog
          </Link>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <Suspense fallback={<div className="h-[108px] rounded-2xl border border-dashed border-border/70 bg-muted/20" />}>
          <HouseTypeChips />
        </Suspense>
      </section>

      <ListingRail title="Rent" href="/houses?type=long_term" listings={rentListings} />
      <ListingRail title="Short Stay" href="/houses?type=short_stay" listings={shortStayListings} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Ready to keep exploring?</h2>
            <p className="text-sm text-muted-foreground">
              Jump into the full Manyumba catalog to filter by location, listing type, and the house setup that fits you.
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
