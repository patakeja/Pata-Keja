"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { houseTypeLabels, listingTypeLabels, primaryHouseTypeFilters } from "@/config/listingPresentation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { HouseType, ListingType, type ListingLocationCatalog } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type HousesFilterToolbarProps = {
  catalog: ListingLocationCatalog;
  resultCount: number;
  initialSearch?: string;
  selectedListingType?: ListingType;
  selectedHouseType?: HouseType;
  selectedCountyId?: number;
  selectedTownId?: number;
  selectedAreaId?: number;
};

const selectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function HousesFilterToolbar({
  catalog,
  resultCount,
  initialSearch,
  selectedListingType,
  selectedHouseType,
  selectedCountyId,
  selectedTownId,
  selectedAreaId
}: HousesFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [search, setSearch] = useState(initialSearch ?? "");
  const [countyId, setCountyId] = useState(selectedCountyId ? String(selectedCountyId) : "");
  const [townId, setTownId] = useState(selectedTownId ? String(selectedTownId) : "");
  const [areaId, setAreaId] = useState(selectedAreaId ? String(selectedAreaId) : "");
  const [isFiltersOpen, setIsFiltersOpen] = useState(
    Boolean(selectedListingType || selectedHouseType || selectedCountyId || selectedTownId || selectedAreaId)
  );

  const parsedCountyId = Number.parseInt(countyId, 10);
  const parsedTownId = Number.parseInt(townId, 10);
  const availableTowns = useMemo(
    () =>
      Number.isFinite(parsedCountyId) ? catalog.towns.filter((town) => town.countyId === parsedCountyId) : [],
    [catalog.towns, parsedCountyId]
  );
  const availableAreas = useMemo(
    () => (Number.isFinite(parsedTownId) ? catalog.areas.filter((area) => area.townId === parsedTownId) : []),
    [catalog.areas, parsedTownId]
  );
  const activeFilterCount = [
    selectedListingType,
    selectedHouseType,
    selectedCountyId,
    selectedTownId,
    selectedAreaId
  ].filter(Boolean).length;

  function navigate(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    navigate((params) => {
      const nextSearch = search.trim();

      if (nextSearch) {
        params.set("q", nextSearch);
      } else {
        params.delete("q");
      }
    });
  }

  function handleListingTypeChange(nextListingType?: ListingType) {
    navigate((params) => {
      if (nextListingType) {
        params.set("type", nextListingType);
      } else {
        params.delete("type");
      }
    });
  }

  function handleHouseTypeChange(nextHouseType?: HouseType) {
    navigate((params) => {
      if (nextHouseType) {
        params.set("category", nextHouseType);
        params.delete("houseType");
      } else {
        params.delete("category");
        params.delete("houseType");
      }
    });
  }

  function applyLocationFilters() {
    navigate((params) => {
      if (countyId) {
        params.set("countyId", countyId);
      } else {
        params.delete("countyId");
      }

      if (townId) {
        params.set("townId", townId);
      } else {
        params.delete("townId");
      }

      if (areaId) {
        params.set("areaId", areaId);
      } else {
        params.delete("areaId");
      }
    });
  }

  function clearLocationFilters() {
    setCountyId("");
    setTownId("");
    setAreaId("");

    navigate((params) => {
      params.delete("countyId");
      params.delete("townId");
      params.delete("areaId");
    });
  }

  function useMyCounty() {
    if (!user?.countyId) {
      return;
    }

    const nextCountyId = String(user.countyId);
    const nextTownId = user.townId ? String(user.townId) : "";
    setCountyId(nextCountyId);
    setTownId(nextTownId);
    setAreaId("");

    navigate((params) => {
      params.set("countyId", nextCountyId);

      if (nextTownId) {
        params.set("townId", nextTownId);
      } else {
        params.delete("townId");
      }

      params.delete("areaId");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <form className="flex flex-1 items-center gap-2" onSubmit={handleSearchSubmit}>
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, area, town, or county"
                className="h-12 pl-10"
                aria-label="Search houses"
              />
            </div>
            <Button type="submit" variant="ghost" size="lg" className="shrink-0">
              Search
            </Button>
          </form>

          <Button
            variant={isFiltersOpen || activeFilterCount > 0 ? "primary" : "outline"}
            size="lg"
            className="shrink-0 gap-2"
            onClick={() => setIsFiltersOpen((current) => !current)}
          >
            <FilterIcon className="h-4 w-4" />
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">All Houses</h1>
            <p className="text-xs text-muted-foreground">
              Minimal search up top, with the full filter set tucked behind one button.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">{resultCount} results</p>
        </div>

        {initialSearch || activeFilterCount > 0 ? (
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {initialSearch ? <span className="rounded-full bg-muted px-2.5 py-1">Search: {initialSearch}</span> : null}
            {selectedListingType ? (
              <span className="rounded-full bg-muted px-2.5 py-1">Type: {listingTypeLabels[selectedListingType]}</span>
            ) : null}
            {selectedHouseType ? (
              <span className="rounded-full bg-muted px-2.5 py-1">Category: {houseTypeLabels[selectedHouseType]}</span>
            ) : null}
            {selectedCountyId ? <span className="rounded-full bg-muted px-2.5 py-1">County filter active</span> : null}
            {selectedTownId ? <span className="rounded-full bg-muted px-2.5 py-1">Town filter active</span> : null}
            {selectedAreaId ? <span className="rounded-full bg-muted px-2.5 py-1">Area filter active</span> : null}
          </div>
        ) : null}

        {isFiltersOpen ? (
          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Stay type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleListingTypeChange(undefined)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold transition",
                    !selectedListingType
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-foreground hover:border-primary/35 hover:bg-primary/5"
                  )}
                >
                  All stays
                </button>
                {[ListingType.LONG_TERM, ListingType.SHORT_STAY].map((listingType) => (
                  <button
                    key={listingType}
                    type="button"
                    onClick={() => handleListingTypeChange(listingType)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition",
                      selectedListingType === listingType
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-foreground hover:border-primary/35 hover:bg-primary/5"
                    )}
                  >
                    {listingTypeLabels[listingType]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Category</p>
                {selectedHouseType ? (
                  <button
                    type="button"
                    onClick={() => handleHouseTypeChange(undefined)}
                    className="text-[11px] font-medium text-primary transition hover:text-primary/80"
                  >
                    Clear category
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {primaryHouseTypeFilters.map((houseType) => {
                  const isActive = selectedHouseType === houseType;

                  return (
                    <button
                      key={houseType}
                      type="button"
                      onClick={() => handleHouseTypeChange(isActive ? undefined : houseType)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold transition",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white text-foreground hover:border-primary/35 hover:bg-primary/5"
                      )}
                    >
                      {houseTypeLabels[houseType]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Location</p>
                  <p className="text-xs text-muted-foreground">Narrow results by county, town, or area.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user?.countyId ? (
                    <Button type="button" variant="outline" size="sm" onClick={useMyCounty}>
                      {user.countyName ? `Use ${user.countyName}` : "Use my county"}
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" size="sm" onClick={clearLocationFilters}>
                    Clear location
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className={selectClassName}
                  value={countyId}
                  onChange={(event) => {
                    setCountyId(event.target.value);
                    setTownId("");
                    setAreaId("");
                  }}
                >
                  <option value="">All counties</option>
                  {catalog.counties.map((county) => (
                    <option key={county.id} value={county.id}>
                      {county.name}
                    </option>
                  ))}
                </select>

                <select
                  className={selectClassName}
                  value={townId}
                  onChange={(event) => {
                    setTownId(event.target.value);
                    setAreaId("");
                  }}
                  disabled={!countyId || availableTowns.length === 0}
                >
                  <option value="">
                    {!countyId ? "All towns" : availableTowns.length > 0 ? "All towns in county" : "No towns in county"}
                  </option>
                  {availableTowns.map((town) => (
                    <option key={town.id} value={town.id}>
                      {town.name}
                    </option>
                  ))}
                </select>

                <select
                  className={selectClassName}
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  disabled={!townId || availableAreas.length === 0}
                >
                  <option value="">
                    {!townId ? "All areas" : availableAreas.length > 0 ? "All areas in town" : "No saved areas in town"}
                  </option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={applyLocationFilters}>
                  Apply location
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
