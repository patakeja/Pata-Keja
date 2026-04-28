/* eslint-disable @next/next/no-img-element */

import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import type { BookingPolicy, ListingDetail as ListingDetailType } from "@/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { ReserveListingButton } from "./reserve-listing-button";

type ListingDetailProps = {
  listing: ListingDetailType;
  bookingPolicy: BookingPolicy;
};

export function ListingDetail({ listing, bookingPolicy }: ListingDetailProps) {
  const galleryItems = listing.imageUrls?.length ? listing.imageUrls : [];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-3">
        <Card className="overflow-hidden">
          <CardContent className="p-2">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_96px]">
              <div className={`relative h-56 overflow-hidden rounded-md bg-gradient-to-br ${listing.coverTone} sm:h-72`}>
                {galleryItems[0] ? (
                  <img
                    src={galleryItems[0]}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-white/20 to-transparent" />
                )}
                <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
                  <Badge>{listingTypeLabels[listing.type]}</Badge>
                  {listing.houseType ? (
                    <span className="rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {houseTypeLabels[listing.houseType]}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={`${listing.id}-thumb-${index}`}
                    className={`h-16 overflow-hidden rounded-md bg-gradient-to-br ${listing.coverTone} lg:h-[70px]`}
                  >
                    {galleryItems[index + 1] ? (
                      <img
                        src={galleryItems[index + 1]}
                        alt={`${listing.title} view ${index + 2}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/15" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">{listing.title}</h1>
                <p className="text-xs text-muted-foreground">{listing.areaLabel} - approximate only</p>
              </div>
              <p className="shrink-0 text-base font-semibold text-foreground">{listing.priceLabel}</p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{listing.summary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Basic info</h2>
              <span className="text-[11px] text-muted-foreground">{listing.availabilityLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              <div className="rounded-md bg-muted px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em]">Beds</p>
                <p className="mt-1 font-medium text-foreground">{listing.bedrooms}</p>
              </div>
              <div className="rounded-md bg-muted px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em]">Baths</p>
                <p className="mt-1 font-medium text-foreground">{listing.bathrooms}</p>
              </div>
              <div className="rounded-md bg-muted px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em]">Guests</p>
                <p className="mt-1 font-medium text-foreground">{listing.guests ?? "-"}</p>
              </div>
              <div className="rounded-md bg-muted px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em]">Host</p>
                <p className="mt-1 font-medium text-foreground">{listing.hostLabel}</p>
              </div>
            </div>
            {listing.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {listing.amenities.map((amenity) => (
                  <span key={amenity} className="rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground">
                    {amenity}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-3">
        <Card>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Unlock full details</h2>
              <p className="text-xs text-muted-foreground">
                Reserve this house first to unlock exact location, landlord chat, and reservation priority.
              </p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-2">
                <span>Exact location</span>
                <span>After booking</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-2">
                <span>Chat access</span>
                <span>After booking</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-2">
                <span>Reservation priority</span>
                <span>{bookingPolicy.reservationWindowHours}h hold</span>
              </div>
            </div>
            <ReserveListingButton listingId={listing.id} canReserve={listing.canReserve} />
            <p className="text-[11px] text-muted-foreground">
              Queue mode: {bookingPolicy.queueStrategy.replaceAll("_", " ")}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Approx area</h3>
            <p className="text-xs text-muted-foreground">{listing.areaLabel}</p>
            <p className="text-[11px] text-muted-foreground">{listing.exactLocationHint}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
