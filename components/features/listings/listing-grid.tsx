import type { ListingPreview } from "@/types";

import { ListingCard } from "./listing-card";

type ListingGridProps = {
  listings: ListingPreview[];
};

export function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
