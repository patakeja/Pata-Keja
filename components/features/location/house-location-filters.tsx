"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store";
import { type ListingLocationCatalog } from "@/types";

import { Button } from "@/components/ui/button";

type HouseLocationFiltersProps = {
  catalog: ListingLocationCatalog;
  selectedCountyId?: number;
  selectedTownId?: number;
  selectedAreaId?: number;
};

const inputClassName =
  "flex h-9 w-full rounded-md border border-input bg-white px-3 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

export function HouseLocationFilters({
  catalog,
  selectedCountyId,
  selectedTownId,
  selectedAreaId
}: HouseLocationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [countyId, setCountyId] = useState(selectedCountyId ? String(selectedCountyId) : "");
  const [townId, setTownId] = useState(selectedTownId ? String(selectedTownId) : "");
  const [areaId, setAreaId] = useState(selectedAreaId ? String(selectedAreaId) : "");

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

  function pushFilters(nextCountyId: string, nextTownId: string, nextAreaId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextCountyId) {
      params.set("countyId", nextCountyId);
    } else {
      params.delete("countyId");
    }

    if (nextTownId) {
      params.set("townId", nextTownId);
    } else {
      params.delete("townId");
    }

    if (nextAreaId) {
      params.set("areaId", nextAreaId);
    } else {
      params.delete("areaId");
    }

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function applyCurrentFilters() {
    pushFilters(countyId, townId, areaId);
  }

  function clearFilters() {
    setCountyId("");
    setTownId("");
    setAreaId("");
    pushFilters("", "", "");
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
    pushFilters(nextCountyId, nextTownId, "");
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Location filter</h2>
          <p className="text-[11px] text-muted-foreground">Filter houses by county, town, or area.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.countyId ? (
            <Button type="button" variant="outline" size="sm" onClick={useMyCounty}>
              {user.countyName ? `Use ${user.countyName}` : "Use my county"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <select
          className={inputClassName}
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
          className={inputClassName}
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
          className={inputClassName}
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
        <Button type="button" size="sm" onClick={applyCurrentFilters}>
          Apply location
        </Button>
      </div>
    </div>
  );
}
