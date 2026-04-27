import type { BookingPolicy, ListingDetail as ListingDetailType } from "@/types";

import { Badge } from "@/components/ui/badge";

import { ReserveCta } from "../booking/reserve-cta";
import { ChatCta } from "../chat/chat-cta";
import { LocationPreview } from "../location/location-preview";

type ListingDetailProps = {
  listing: ListingDetailType;
  reserveHref: string;
  chatHref: string;
  locationHref: string;
  bookingPolicy: BookingPolicy;
};

export function ListingDetail({ listing, reserveHref, chatHref, locationHref, bookingPolicy }: ListingDetailProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
      <section className="space-y-6">
        <div className={`rounded-[32px] bg-gradient-to-br ${listing.coverTone} p-8 shadow-soft`}>
          <Badge className="bg-white/70 text-foreground">{listing.type.replaceAll("_", " ")}</Badge>
          <div className="mt-8 space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {listing.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-foreground/80">{listing.summary}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-white/85 p-5">
            <p className="text-sm text-muted-foreground">Pricing</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{listing.priceLabel}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white/85 p-5">
            <p className="text-sm text-muted-foreground">Layout</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {listing.bedrooms} bed / {listing.bathrooms} bath
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white/85 p-5">
            <p className="text-sm text-muted-foreground">Availability</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{listing.availabilityLabel}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-white/90 p-6 shadow-soft">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Amenities and hosting</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {listing.amenities.map((amenity) => (
              <span key={amenity} className="rounded-full bg-muted px-4 py-2 text-sm text-foreground">
                {amenity}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">{listing.hostLabel}</p>
        </div>
      </section>

      <aside className="space-y-4">
        <ReserveCta href={reserveHref} policy={bookingPolicy} />
        <ChatCta href={chatHref} />
        <LocationPreview areaLabel={listing.areaLabel} exactLocationHint={listing.exactLocationHint} unlockHref={locationHref} />
      </aside>
    </div>
  );
}
