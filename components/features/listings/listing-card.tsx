/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListingAvailabilityStatus, type ListingPreview } from "@/types";

type ListingCardProps = {
  listing: ListingPreview;
};

export function ListingCard({ listing }: ListingCardProps) {
  const availabilityLabel =
    listing.availabilityStatus === ListingAvailabilityStatus.COMING_SOON
      ? listing.availableFrom
        ? `From ${listing.availableFrom}`
        : "Coming soon"
      : listing.availabilityStatus === ListingAvailabilityStatus.FULL
        ? "Full"
        : "Available";

  return (
    <Link href={`/listing/${listing.id}`} className="block">
      <Card className="h-full overflow-hidden border-border/80 transition hover:border-primary/40">
        <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${listing.coverTone}`}>
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-white/20 to-transparent" />
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <Badge>{listingTypeLabels[listing.type]}</Badge>
            {listing.houseType ? (
              <span className="rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                {houseTypeLabels[listing.houseType]}
              </span>
            ) : null}
          </div>
        </div>
        <CardContent className="space-y-2 p-2.5">
          <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground">{listing.title}</h3>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span>{listing.bedrooms} bed</span>
            <span>{listing.bathrooms} bath</span>
            {listing.guests ? <span>{listing.guests} guests</span> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{listing.areaLabel}</p>
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {availabilityLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{listing.priceLabel}</p>
            <span className={buttonVariants({ variant: "outline", size: "sm" })}>View</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
