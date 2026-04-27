import type { ListingPreview } from "@/types";

import { ListingCard } from "./listing-card";

type ListingGridProps = {
  listings: ListingPreview[];
};

export function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
