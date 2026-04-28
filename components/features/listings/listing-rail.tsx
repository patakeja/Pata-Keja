import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { ListingPreview } from "@/types";

import { ListingCard } from "./listing-card";

type ListingRailProps = {
  title: string;
  href: string;
  listings: ListingPreview[];
};

export function ListingRail({ title, href, listings }: ListingRailProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          View all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {listings.map((listing) => (
          <div key={listing.id} className="w-[220px] min-w-[220px] max-w-[220px] flex-none sm:w-[230px] sm:min-w-[230px]">
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>
    </section>
  );
}
