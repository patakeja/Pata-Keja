import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ListingPreview } from "@/types";

type ListingCardProps = {
  listing: ListingPreview;
};

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/listing/${listing.id}`} className="block transition-transform hover:-translate-y-1">
      <Card className="h-full overflow-hidden">
        <div className={`h-48 bg-gradient-to-br ${listing.coverTone} p-6`}>
          <Badge>{listing.type.replaceAll("_", " ")}</Badge>
        </div>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{listing.title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{listing.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{listing.bedrooms} bed</span>
            <span>{listing.bathrooms} bath</span>
            {listing.guests ? <span>{listing.guests} guests</span> : null}
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{listing.priceLabel}</p>
            <p className="text-sm text-muted-foreground">{listing.areaLabel}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
