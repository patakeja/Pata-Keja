"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import { landlordService } from "@/lib/landlordService";
import {
  HouseType,
  ListingAvailabilityStatus,
  type LandlordHouseRecord,
  type LandlordHouseSummary,
  type ListingPublishProgress,
  type PlatformBookingOption
} from "@/types";

import {
  LandlordHouseEditor,
  type LandlordHouseEditorSubmitPayload
} from "@/components/features/landlord/landlord-house-editor";
import {
  LandlordRentalDialog,
  type LandlordRentalDialogSubmitPayload
} from "@/components/features/landlord/landlord-rental-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AdminCreatedHousesPanelProps = {
  refreshToken?: number;
  onCreateRequested?: () => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading created houses.";
}

function getStatusLabel(status: ListingAvailabilityStatus, availableFrom: string | null) {
  if (status === ListingAvailabilityStatus.FULL) {
    return "Full";
  }

  if (status === ListingAvailabilityStatus.COMING_SOON) {
    return availableFrom ? `Coming ${availableFrom}` : "Coming soon";
  }

  return "Available";
}

function formatPrice(value: number, listingType: LandlordHouseSummary["listingType"]) {
  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  });

  return `${formatter.format(value)} / ${listingType === "short_stay" ? "night" : "month"}`;
}

export function AdminCreatedHousesPanel({
  refreshToken = 0,
  onCreateRequested
}: AdminCreatedHousesPanelProps) {
  const [houses, setHouses] = useState<LandlordHouseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [selectedLandlordId, setSelectedLandlordId] = useState("all");
  const [selectedHouseType, setSelectedHouseType] = useState<HouseType | "all">("all");

  const [selectedHouse, setSelectedHouse] = useState<LandlordHouseRecord | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<ListingPublishProgress | null>(null);

  const [rentListingId, setRentListingId] = useState<string | null>(null);
  const [platformBookings, setPlatformBookings] = useState<PlatformBookingOption[]>([]);
  const [isRentOptionsLoading, setIsRentOptionsLoading] = useState(false);
  const [isMarkingRented, setIsMarkingRented] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const nextHouses = await landlordService.getMyHouses();

        if (isMounted) {
          setHouses(nextHouses);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  function upsertHouse(nextHouse: LandlordHouseRecord) {
    setHouses((currentHouses) =>
      currentHouses.map((house) => (house.id === nextHouse.id ? nextHouse : house))
    );
  }

  async function handleOpenEditor(listingId: string) {
    setEditError(null);
    setEditProgress(null);

    try {
      const house = await landlordService.getHouseById(listingId);
      setSelectedHouse(house);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  async function handleEditorSubmit(payload: LandlordHouseEditorSubmitPayload) {
    if (!selectedHouse) {
      return;
    }

    setIsEditSaving(true);
    setEditError(null);
    setEditProgress(null);

    try {
      const updatedHouse = await landlordService.updateHouse(selectedHouse.id, payload.input, {
        imageFiles: payload.files,
        replaceImages: payload.replaceGallery,
        onProgress: (progress) => {
          setEditProgress({
            ...progress,
            message:
              progress.stage === "compressing"
                ? `Compressing ${progress.fileName}`
                : `Uploading ${progress.fileName}`
          });
        }
      });

      upsertHouse(updatedHouse);
      setSelectedHouse(null);
    } catch (saveError) {
      setEditError(getErrorMessage(saveError));
    } finally {
      setIsEditSaving(false);
    }
  }

  async function handleOpenRentalDialog(listingId: string) {
    setRentListingId(listingId);
    setRentError(null);
    setPlatformBookings([]);
    setIsRentOptionsLoading(true);

    try {
      const nextBookings = await landlordService.getPlatformBookingOptions(listingId);
      setPlatformBookings(nextBookings);
    } catch (loadError) {
      setRentError(getErrorMessage(loadError));
    } finally {
      setIsRentOptionsLoading(false);
    }
  }

  async function handleRentalSubmit(payload: LandlordRentalDialogSubmitPayload) {
    if (!rentListingId) {
      return;
    }

    setIsMarkingRented(true);
    setRentError(null);

    try {
      const result = await landlordService.markHouseAsRented({
        listingId: rentListingId,
        source: payload.source,
        bookingId: payload.bookingId,
        notes: payload.notes
      });

      upsertHouse(result.listing);
      setRentListingId(null);
      setPlatformBookings([]);
    } catch (submitError) {
      setRentError(getErrorMessage(submitError));
    } finally {
      setIsMarkingRented(false);
    }
  }

  async function handleDeleteHouse(listingId: string, title: string) {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setDeletingListingId(listingId);
    setError(null);

    try {
      await landlordService.deleteHouse(listingId);
      setHouses((currentHouses) => currentHouses.filter((house) => house.id !== listingId));

      if (selectedHouse?.id === listingId) {
        setSelectedHouse(null);
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingListingId(null);
    }
  }

  const areaOptions = [...new Map(houses.map((house) => [house.areaId, house])).values()].sort((left, right) =>
    left.areaName.localeCompare(right.areaName)
  );
  const landlordOptions = [...new Map(houses.map((house) => [house.landlordId, house])).values()].sort((left, right) =>
    (left.landlordName ?? "").localeCompare(right.landlordName ?? "")
  );
  const sizeOptions = [...new Set(houses.map((house) => house.houseType))].sort((left, right) =>
    houseTypeLabels[left].localeCompare(houseTypeLabels[right])
  );
  const filteredHouses = houses.filter((house) => {
    const matchesArea = selectedAreaId === "all" || String(house.areaId) === selectedAreaId;
    const matchesLandlord = selectedLandlordId === "all" || house.landlordId === selectedLandlordId;
    const matchesHouseType = selectedHouseType === "all" || house.houseType === selectedHouseType;

    return matchesArea && matchesLandlord && matchesHouseType;
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Created houses</h1>
            <p className="text-xs text-muted-foreground">
              Filter inventory by area, landlord, or size, then edit or delete directly from this admin workspace.
            </p>
          </div>
          {onCreateRequested ? (
            <Button type="button" onClick={onCreateRequested}>
              Create house
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="created-houses-area" className="text-[11px] font-medium text-foreground">
              Filter by area
            </label>
            <select
              id="created-houses-area"
              className="flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={selectedAreaId}
              onChange={(event) => setSelectedAreaId(event.target.value)}
            >
              <option value="all">All areas</option>
              {areaOptions.map((house) => (
                <option key={house.areaId} value={house.areaId}>
                  {house.areaName}, {house.townName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="created-houses-landlord" className="text-[11px] font-medium text-foreground">
              Filter by landlord
            </label>
            <select
              id="created-houses-landlord"
              className="flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={selectedLandlordId}
              onChange={(event) => setSelectedLandlordId(event.target.value)}
            >
              <option value="all">All landlords</option>
              {landlordOptions.map((house) => (
                <option key={house.landlordId} value={house.landlordId}>
                  {house.landlordName ?? "Unknown landlord"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="created-houses-size" className="text-[11px] font-medium text-foreground">
              Filter by size
            </label>
            <select
              id="created-houses-size"
              className="flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={selectedHouseType}
              onChange={(event) => setSelectedHouseType(event.target.value as HouseType | "all")}
            >
              <option value="all">All sizes</option>
              {sizeOptions.map((houseType) => (
                <option key={houseType} value={houseType}>
                  {houseTypeLabels[houseType]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">Loading created houses...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-xs text-rose-700">{error}</CardContent>
        </Card>
      ) : filteredHouses.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">
              Showing {filteredHouses.length} of {houses.length} houses
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {filteredHouses.map((house) => (
              <Card key={house.id} className="overflow-hidden">
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                      {house.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={house.primaryImageUrl}
                          alt={house.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-emerald-100 to-[#F8F1E8]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge>{getStatusLabel(house.availabilityStatus, house.availableFrom)}</Badge>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                          {listingTypeLabels[house.listingType]}
                        </span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                          {houseTypeLabels[house.houseType]}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{house.title}</p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {house.areaName}, {house.townName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Landlord: {house.landlordName ?? "Unknown landlord"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatPrice(house.price, house.listingType)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-muted px-2 py-2">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Available units</p>
                      <p className="mt-1 font-semibold text-foreground">{house.availableUnits}</p>
                    </div>
                    <div className="rounded-md bg-muted px-2 py-2">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Capacity</p>
                      <p className="mt-1 font-semibold text-foreground">{house.maxActiveBookings}</p>
                    </div>
                    <div className="rounded-md bg-muted px-2 py-2">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Visibility</p>
                      <p className="mt-1 font-semibold text-foreground">{house.isActive ? "Visible" : "Paused"}</p>
                    </div>
                  </div>

                  {house.needsImageRefresh ? (
                    <p className="rounded-xl border border-accent/35 bg-accent/15 px-2 py-2 text-[11px] text-accent-foreground">
                      Consider updating images. This gallery has not been refreshed recently.
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void handleOpenEditor(house.id)}>
                      Edit house
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => void handleOpenRentalDialog(house.id)}
                    >
                      Mark as rented
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => void handleDeleteHouse(house.id, house.title)}
                      disabled={deletingListingId === house.id}
                    >
                      {deletingListingId === house.id ? "Deleting..." : "Delete house"}
                    </Button>
                    <Link href={`/listing/${house.id}`} className={buttonVariants({ variant: "ghost", size: "md" })}>
                      View live
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-6">
            <p className="text-xs text-muted-foreground">
              {houses.length > 0 ? "No houses match the active filters." : "No houses have been created yet."}
            </p>
            {onCreateRequested ? (
              <Button type="button" onClick={onCreateRequested}>
                Create house
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      {selectedHouse ? (
        <LandlordHouseEditor
          house={selectedHouse}
          isSaving={isEditSaving}
          error={editError}
          progress={editProgress}
          onClose={() => setSelectedHouse(null)}
          onSubmit={handleEditorSubmit}
        />
      ) : null}

      <LandlordRentalDialog
        isOpen={Boolean(rentListingId)}
        isSaving={isMarkingRented}
        isLoadingOptions={isRentOptionsLoading}
        error={rentError}
        platformBookings={platformBookings}
        onClose={() => {
          setRentListingId(null);
          setPlatformBookings([]);
          setRentError(null);
        }}
        onSubmit={handleRentalSubmit}
      />
    </div>
  );
}
