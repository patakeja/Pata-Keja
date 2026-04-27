import Link from "next/link";

import { ListingGrid } from "@/components/features/listings/listing-grid";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { listingService } from "@/lib/listingService";

export default async function HomePage() {
  const listings = await listingService.getPublicListings();
  const featuredListings = listings.slice(0, 2);

  return (
    <div className="space-y-20 py-10 pb-20">
      <PageShell>
        <section className="grid gap-10 rounded-[36px] border border-border/60 bg-white/80 p-8 shadow-soft lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Hybrid Real Estate Platform</p>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-5xl leading-tight tracking-tight text-foreground [font-family:var(--font-display)] sm:text-6xl">
                  A modular foundation for rentals, short stays, and reservations.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  Pata Keja is scaffolded for growth: public discovery, role-based workspaces, Supabase-backed auth, and
                  a booking architecture that can expand without rewriting the app shell.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/listings" className={buttonVariants({ size: "lg" })}>
                Explore listings
              </Link>
              <Link href="/signup" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Create account
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[28px] bg-primary p-6 text-primary-foreground">
              <p className="text-sm uppercase tracking-[0.2em] text-primary-foreground/75">Architecture</p>
              <p className="mt-4 text-2xl font-semibold">Service-first and feature-isolated</p>
            </div>
            <div className="rounded-[28px] bg-secondary p-6 text-secondary-foreground">
              <p className="text-sm uppercase tracking-[0.2em] text-secondary-foreground/75">Booking</p>
              <p className="mt-4 text-2xl font-semibold">Multi-interest queue with configurable reservation expiry</p>
            </div>
            <div className="rounded-[28px] bg-accent p-6 text-accent-foreground">
              <p className="text-sm uppercase tracking-[0.2em] text-accent-foreground/75">Deploy</p>
              <p className="mt-4 text-2xl font-semibold">Vercel-ready Next.js and Supabase scaffold</p>
            </div>
          </div>
        </section>
      </PageShell>

      <PageShell className="space-y-8">
        <SectionHeading
          eyebrow="Public Discovery"
          title="Featured placeholder inventory"
          description="These cards are sourced through the listing service so the UI stays detached from data and future Supabase queries."
          actions={
            <Link href="/listings" className={buttonVariants({ variant: "ghost" })}>
              View all listings
            </Link>
          }
        />
        <ListingGrid listings={featuredListings} />
      </PageShell>
    </div>
  );
}
