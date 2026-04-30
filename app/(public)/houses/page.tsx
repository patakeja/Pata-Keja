import { Suspense } from "react";

import { HousesFilterToolbar } from "@/components/features/listings/houses-filter-toolbar";
import { ListingGrid } from "@/components/features/listings/listing-grid";
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
      <Suspense fallback={<div className="h-[220px] rounded-2xl border border-dashed border-border/70 bg-muted/20" />}>
        <HousesFilterToolbar
          catalog={locationCatalog}
          resultCount={listings.length}
          initialSearch={search}
          selectedListingType={isListingType(listingType) ? listingType : undefined}
          selectedHouseType={isHouseType(houseType) ? houseType : undefined}
          selectedCountyId={countyId}
          selectedTownId={townId}
          selectedAreaId={areaId}
        />
      </Suspense>

      <ListingGrid listings={listings} />
    </PageShell>
  );
}
