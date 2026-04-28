import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import { HouseTypeChips } from "@/components/features/listings/house-type-chips";
import { ListingGrid } from "@/components/features/listings/listing-grid";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { listingService } from "@/lib/listingService";
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

export default async function HousesPage({ searchParams }: HousesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const search = getSingleValue(resolvedSearchParams.q);
  const listingType = getSingleValue(resolvedSearchParams.type);
  const houseType = getSingleValue(resolvedSearchParams.houseType);

  const filters: ListingFilters = {
    isActive: true,
    limit: 24,
    ...(search ? { search } : {}),
    ...(isListingType(listingType) ? { listingType } : {}),
    ...(isHouseType(houseType) ? { houseType } : {})
  };

  const listings = await listingService.getPublicListings(filters);

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
          </div>

          <HouseTypeChips selectedHouseType={isHouseType(houseType) ? houseType : undefined} />
        </CardContent>
      </Card>

      <ListingGrid listings={listings} />
    </PageShell>
  );
}
