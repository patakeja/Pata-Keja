"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import { landlordService } from "@/lib/landlordService";
import {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading landlord inventory.";
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

export function LandlordHousesPanel() {
  const [houses, setHouses] = useState<LandlordHouseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedHouse, setSelectedHouse] = useState<LandlordHouseRecord | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<ListingPublishProgress | null>(null);

  const [rentListingId, setRentListingId] = useState<string | null>(null);
  const [platformBookings, setPlatformBookings] = useState<PlatformBookingOption[]>([]);
  const [isRentOptionsLoading, setIsRentOptionsLoading] = useState(false);
  const [isMarkingRented, setIsMarkingRented] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);

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
  }, []);

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

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">My houses</h1>
            <p className="text-xs text-muted-foreground">
              Manage pricing, stock, image freshness, and completed rentals from one compact landlord workspace.
            </p>
          </div>
          <Link href="/landlord/create-listing" className={buttonVariants({ size: "md" })}>
            Create listing
          </Link>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">Loading houses...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-xs text-rose-700">{error}</CardContent>
        </Card>
      ) : houses.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {houses.map((house) => (
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
                  <Button variant="ghost" onClick={() => void handleOpenRentalDialog(house.id)}>
                    Mark as rented
                  </Button>
                  <Link href={`/listing/${house.id}`} className={buttonVariants({ variant: "ghost", size: "md" })}>
                    View live
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-6">
            <p className="text-xs text-muted-foreground">No houses published yet.</p>
            <Link href="/landlord/create-listing" className={buttonVariants({ size: "md" })}>
              Create your first listing
            </Link>
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
