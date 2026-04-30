"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { locationService } from "@/lib/locationService";
import { type ListingLocationCatalog } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage } from "@/components/ui/toast-message";

type LocationManagementPanelProps = {
  title?: string;
  description?: string;
  onLocationCreated?: () => void;
};

const inputClassName =
  "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not save that location right now.";
}

export function LocationManagementPanel({
  title = "Create location",
  description = "Counties are preloaded. Pick a county, select an existing town or type a new one, then enter the area manually.",
  onLocationCreated
}: LocationManagementPanelProps) {
  const [catalog, setCatalog] = useState<ListingLocationCatalog>({
    counties: [],
    towns: [],
    areas: []
  });
  const [countyId, setCountyId] = useState("");
  const [townMode, setTownMode] = useState<"select" | "manual">("select");
  const [townId, setTownId] = useState("");
  const [townName, setTownName] = useState("");
  const [areaName, setAreaName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const selectedCountyId = Number.parseInt(countyId, 10);
  const selectedTownId = Number.parseInt(townId, 10);
  const availableTowns = useMemo(
    () =>
      Number.isFinite(selectedCountyId)
        ? catalog.towns.filter((town) => town.countyId === selectedCountyId)
        : [],
    [catalog.towns, selectedCountyId]
  );
  const existingAreas = useMemo(
    () =>
      Number.isFinite(selectedTownId)
        ? catalog.areas.filter((area) => area.townId === selectedTownId)
        : [],
    [catalog.areas, selectedTownId]
  );

  useEffect(() => {
    void loadCatalog();
  }, []);

  async function loadCatalog() {
    setIsLoading(true);

    try {
      const nextCatalog = await locationService.getLocationCatalog();
      setCatalog(nextCatalog);
    } catch (error) {
      setToast({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    setIsSaving(true);

    try {
      const createdLocation = await locationService.createManagedLocation({
        countyId: Number.parseInt(countyId, 10),
        townId: townMode === "select" && townId ? Number.parseInt(townId, 10) : undefined,
        townName: townMode === "manual" ? townName : undefined,
        areaName
      });

      await loadCatalog();
      setCountyId(String(createdLocation.county.id));
      setTownMode("select");
      setTownId(String(createdLocation.town.id));
      setTownName("");
      setAreaName("");
      setToast({
        tone: "success",
        message: `${createdLocation.area.name}, ${createdLocation.town.name} was added successfully.`
      });
      onLocationCreated?.();
    } catch (error) {
      setToast({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {toast ? <ToastMessage tone={toast.tone} message={toast.message} /> : null}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="location-county" className="text-[11px] font-medium text-foreground">
              County
            </label>
            <select
              id="location-county"
              className={inputClassName}
              value={countyId}
              onChange={(event) => {
                setCountyId(event.target.value);
                setTownId("");
              }}
              disabled={isSaving || isLoading}
              required
            >
              <option value="">Select county</option>
              {catalog.counties.map((county) => (
                <option key={county.id} value={county.id}>
                  {county.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-foreground">Town</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={townMode === "select" ? "primary" : "outline"}
                size="sm"
                onClick={() => setTownMode("select")}
                disabled={isSaving || isLoading}
              >
                Select town
              </Button>
              <Button
                type="button"
                variant={townMode === "manual" ? "primary" : "outline"}
                size="sm"
                onClick={() => setTownMode("manual")}
                disabled={isSaving || isLoading}
              >
                Type town
              </Button>
            </div>
          </div>

          {townMode === "select" ? (
            <div className="space-y-1">
              <label htmlFor="location-town-id" className="text-[11px] font-medium text-foreground">
                Existing town
              </label>
              <select
                id="location-town-id"
                className={inputClassName}
                value={townId}
                onChange={(event) => setTownId(event.target.value)}
                disabled={isSaving || isLoading || !countyId}
                required
              >
                <option value="">{countyId ? "Select town" : "Select county first"}</option>
                {availableTowns.map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="location-town-name" className="text-[11px] font-medium text-foreground">
                New town name
              </label>
              <Input
                id="location-town-name"
                value={townName}
                onChange={(event) => setTownName(event.target.value)}
                placeholder="Enter town name"
                disabled={isSaving || isLoading || !countyId}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="location-area-name" className="text-[11px] font-medium text-foreground">
              Area
            </label>
            <Input
              id="location-area-name"
              value={areaName}
              onChange={(event) => setAreaName(event.target.value)}
              placeholder="Enter area manually"
              disabled={isSaving || isLoading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Create location"}
          </Button>
        </form>

        {townMode === "select" && townId ? (
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-foreground">Existing areas in this town</p>
              <span className="text-[10px] text-muted-foreground">{existingAreas.length} saved</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {existingAreas.length > 0 ? (
                existingAreas.slice(0, 10).map((area) => (
                  <span key={area.id} className="rounded-full bg-white px-2 py-1 text-[10px] text-foreground">
                    {area.name}
                  </span>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground">No areas saved for this town yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
