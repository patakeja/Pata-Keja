"use client";

import { useEffect, useMemo, useState } from "react";

import { locationService } from "@/lib/locationService";
import { type ListingLocationCatalog } from "@/types";

type LocationPreferenceFieldsProps = {
  countyId: string;
  townId: string;
  onCountyChange: (value: string) => void;
  onTownChange: (value: string) => void;
  disabled?: boolean;
};

const inputClassName =
  "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

export function LocationPreferenceFields({
  countyId,
  townId,
  onCountyChange,
  onTownChange,
  disabled = false
}: LocationPreferenceFieldsProps) {
  const [catalog, setCatalog] = useState<ListingLocationCatalog>({
    counties: [],
    towns: [],
    areas: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const selectedCountyId = Number.parseInt(countyId, 10);
  const availableTowns = useMemo(
    () =>
      Number.isFinite(selectedCountyId)
        ? catalog.towns.filter((town) => town.countyId === selectedCountyId)
        : [],
    [catalog.towns, selectedCountyId]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        const nextCatalog = await locationService.getLocationCatalog();

        if (isMounted) {
          setCatalog(nextCatalog);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="profile-county" className="text-[11px] font-medium text-foreground">
          Preferred county
        </label>
        <select
          id="profile-county"
          className={inputClassName}
          value={countyId}
          onChange={(event) => onCountyChange(event.target.value)}
          disabled={disabled || isLoading}
        >
          <option value="">No preferred county</option>
          {catalog.counties.map((county) => (
            <option key={county.id} value={county.id}>
              {county.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-town" className="text-[11px] font-medium text-foreground">
          Preferred town
        </label>
        <select
          id="profile-town"
          className={inputClassName}
          value={townId}
          onChange={(event) => onTownChange(event.target.value)}
          disabled={disabled || isLoading || !countyId || availableTowns.length === 0}
        >
          <option value="">
            {!countyId ? "Select county first" : availableTowns.length > 0 ? "No preferred town" : "No towns in county"}
          </option>
          {availableTowns.map((town) => (
            <option key={town.id} value={town.id}>
              {town.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
