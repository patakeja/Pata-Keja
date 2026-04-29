import { Suspense } from "react";

import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import { HouseTypeChips } from "@/components/features/listings/house-type-chips";
import { ListingGrid } from "@/components/features/listings/listing-grid";
import { HouseLocationFilters } from "@/components/features/location/house-location-filters";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { listingService } from "@/lib/listingService";
import { locationService } from "@/lib/locationService";
import { HouseType, ListingType, type ListingFilters } from "@/types";

type HousesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}

function isListingType(value?: string): value is ListingType {
  return value === ListingType.LONG_TERM || value === ListingType.SHORT_STAY;
}

function isHouseType(value?: string): value is HouseType {
  return Object.values(HouseType).includes(value as HouseType);
}

function parsePositiveInteger(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

export default async function HousesPage({ searchParams }: HousesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const search = getSingleValue(resolvedSearchParams.q);
  const listingType = getSingleValue(resolvedSearchParams.type);
  const houseType = getSingleValue(resolvedSearchParams.category) ?? getSingleValue(resolvedSearchParams.houseType);
  const countyId = parsePositiveInteger(getSingleValue(resolvedSearchParams.countyId));
  const townId = parsePositiveInteger(getSingleValue(resolvedSearchParams.townId));
  const areaId = parsePositiveInteger(getSingleValue(resolvedSearchParams.areaId));

  const filters: ListingFilters = {
    isActive: true,
    limit: 24,
    ...(search ? { search } : {}),
    ...(isListingType(listingType) ? { listingType } : {}),
    ...(isHouseType(houseType) ? { houseType } : {}),
    ...(countyId ? { countyId } : {}),
    ...(townId ? { townId } : {}),
    ...(areaId ? { areaId } : {})
  };

  const [listings, locationCatalog] = await Promise.all([
    listingService.getPublicListings(filters),
    locationService.getLocationCatalog()
  ]);

  return (
    <PageShell className="space-y-4 py-3 pb-6">
      <Card>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-foreground">All Houses</h1>
              <p className="text-xs text-muted-foreground">Filter by house type, search term, or stay type.</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{listings.length} results</p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {search ? <span className="rounded-md bg-muted px-2 py-1">Search: {search}</span> : null}
            {isListingType(listingType) ? (
              <span className="rounded-md bg-muted px-2 py-1">Type: {listingTypeLabels[listingType]}</span>
            ) : null}
            {isHouseType(houseType) ? (
              <span className="rounded-md bg-muted px-2 py-1">Category: {houseTypeLabels[houseType]}</span>
            ) : null}
            {countyId ? <span className="rounded-md bg-muted px-2 py-1">County filter active</span> : null}
            {townId ? <span className="rounded-md bg-muted px-2 py-1">Town filter active</span> : null}
            {areaId ? <span className="rounded-md bg-muted px-2 py-1">Area filter active</span> : null}
          </div>

          <Suspense fallback={<div className="h-[108px] rounded-2xl border border-dashed border-border/70 bg-muted/20" />}>
            <HouseTypeChips selectedHouseType={isHouseType(houseType) ? houseType : undefined} />
          </Suspense>
        </CardContent>
      </Card>

      <Suspense fallback={<div className="h-[172px] rounded-lg border border-dashed border-border/70 bg-muted/20" />}>
        <HouseLocationFilters
          catalog={locationCatalog}
          selectedCountyId={countyId}
          selectedTownId={townId}
          selectedAreaId={areaId}
        />
      </Suspense>

      <ListingGrid listings={listings} />
    </PageShell>
  );
}
