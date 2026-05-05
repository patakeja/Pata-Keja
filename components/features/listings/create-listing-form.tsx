"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { houseTypeLabels, listingTypeLabels } from "@/config/listingPresentation";
import { adminService } from "@/lib/adminService";
import { paymentService } from "@/lib/paymentService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { listingPublishingService } from "@/lib/listingPublishingService";
import { listingService } from "@/lib/listingService";
import { cn } from "@/lib/utils";
import {
  HouseType,
  ListingType,
  UserRole,
  type AdminUserRoleEntry,
  type CreateListingInput,
  type ListingLocationCatalog,
  type ListingRecord,
  type ListingPublishProgress
} from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { ImageUploadInput } from "./image-upload-input";

type CreateListingFormProps = {
  workspaceLabel: "Landlord" | "Admin";
  title: string;
  description: string;
  catalogRefreshToken?: number;
  redirectOnSuccess?: boolean;
  onCreated?: (listing: ListingRecord) => void | Promise<void>;
};

type ListingFormState = {
  landlordId: string;
  title: string;
  description: string;
  listingType: ListingType;
  houseType: HouseType;
  price: string;
  countyId: string;
  townId: string;
  areaId: string;
  totalUnits: string;
  availableUnits: string;
  bookingCapacityPerUnit: string;
  depositAmount: string;
  holdDurationHours: string;
  availableFrom: string;
  mapsLink: string;
  isActive: boolean;
};

const inputClassName =
  "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
const textareaClassName =
  "flex min-h-28 w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

function buildInitialFormState(landlordId = "", bookingCapacityPerUnit = "1"): ListingFormState {
  return {
    landlordId,
    title: "",
    description: "",
    listingType: ListingType.LONG_TERM,
    houseType: HouseType.ONE_BEDROOM,
    price: "",
    countyId: "",
    townId: "",
    areaId: "",
    totalUnits: "1",
    availableUnits: "1",
    bookingCapacityPerUnit,
    depositAmount: "0",
    holdDurationHours: "72",
    availableFrom: "",
    mapsLink: "",
    isActive: true
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not publish this listing right now.";
}

function parseRequiredInteger(value: string) {
  return Number.parseInt(value, 10);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  return Number.parseFloat(value);
}

function buildCreateListingInput(state: ListingFormState): CreateListingInput {
  return {
    landlordId: state.landlordId.trim() || undefined,
    title: state.title,
    description: state.description,
    price: Number.parseFloat(state.price),
    listingType: state.listingType,
    houseType: state.houseType,
    countyId: parseRequiredInteger(state.countyId),
    townId: parseRequiredInteger(state.townId),
    areaId: parseRequiredInteger(state.areaId),
    totalUnits: parseRequiredInteger(state.totalUnits),
    availableUnits: parseRequiredInteger(state.availableUnits),
    bookingCapacityPerUnit: parseRequiredInteger(state.bookingCapacityPerUnit),
    depositAmount: parseOptionalNumber(state.depositAmount),
    holdDurationHours: parseRequiredInteger(state.holdDurationHours),
    availableFrom: state.availableFrom.trim() || null,
    mapsLink: state.mapsLink.trim() || null,
    isActive: state.isActive
  };
}

export function CreateListingForm({
  workspaceLabel,
  title,
  description,
  catalogRefreshToken = 0,
  redirectOnSuccess = true,
  onCreated
}: CreateListingFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<ListingFormState>(() => buildInitialFormState());
  const [defaultBookingCapacityPerUnit, setDefaultBookingCapacityPerUnit] = useState("1");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [landlordOptions, setLandlordOptions] = useState<AdminUserRoleEntry[]>([]);
  const [catalog, setCatalog] = useState<ListingLocationCatalog>({
    counties: [],
    towns: [],
    areas: []
  });
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isLandlordLoading, setIsLandlordLoading] = useState(workspaceLabel === "Admin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<ListingPublishProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSupabaseReady = isSupabaseConfigured();
  const hasSeededLocations = catalog.counties.length > 0;
  const selectedCountyId = Number.parseInt(formState.countyId, 10);
  const selectedTownId = Number.parseInt(formState.townId, 10);
  const availableTowns = Number.isFinite(selectedCountyId)
    ? catalog.towns.filter((town) => town.countyId === selectedCountyId)
    : catalog.towns;
  const availableAreas = Number.isFinite(selectedTownId)
    ? catalog.areas.filter((area) => area.townId === selectedTownId)
    : catalog.areas;
  const requiresLandlordSelection = workspaceLabel === "Admin";

  useEffect(() => {
    let isMounted = true;

    async function loadDefaultBookingCapacity() {
      if (!isSupabaseReady) {
        return;
      }

      try {
        const financeSettings = await paymentService.getFinanceSettings();
        const nextDefaultValue = String(financeSettings.bookingCapacityMultiplier);

        if (isMounted) {
          setDefaultBookingCapacityPerUnit(nextDefaultValue);
          setFormState((currentState) =>
            currentState.bookingCapacityPerUnit === "1"
              ? {
                  ...currentState,
                  bookingCapacityPerUnit: nextDefaultValue
                }
              : currentState
          );
        }
      } catch {
        // Fall back to the local default when finance settings are unavailable.
      }
    }

    async function loadLocationCatalog() {
      if (!isSupabaseReady) {
        setIsLocationLoading(false);
        return;
      }

      try {
        const nextCatalog = await listingService.getLocationCatalog();

        if (isMounted) {
          setCatalog(nextCatalog);
        }
      } catch (catalogError) {
        if (isMounted) {
          setError(getErrorMessage(catalogError));
        }
      } finally {
        if (isMounted) {
          setIsLocationLoading(false);
        }
      }
    }

    void loadDefaultBookingCapacity();
    void loadLocationCatalog();
    return () => {
      isMounted = false;
    };
  }, [catalogRefreshToken, isSupabaseReady]);

  useEffect(() => {
    let isMounted = true;

    async function loadLandlordOptions() {
      if (!isSupabaseReady || workspaceLabel !== "Admin") {
        setIsLandlordLoading(false);
        return;
      }

      try {
        const userDirectory = await adminService.getUserRoleDirectory();
        const landlords = userDirectory
          .filter((entry) => entry.role === UserRole.LANDLORD)
          .sort((left, right) => left.fullName.localeCompare(right.fullName));

        if (isMounted) {
          setLandlordOptions(landlords);
          setFormState((currentState) => {
            if (currentState.landlordId && landlords.some((landlord) => landlord.id === currentState.landlordId)) {
              return currentState;
            }

            return {
              ...currentState,
              landlordId: landlords[0]?.id ?? ""
            };
          });
        }
      } catch (landlordError) {
        if (isMounted) {
          setError(getErrorMessage(landlordError));
        }
      } finally {
        if (isMounted) {
          setIsLandlordLoading(false);
        }
      }
    }

    void loadLandlordOptions();

    return () => {
      isMounted = false;
    };
  }, [isSupabaseReady, workspaceLabel]);

  function updateField<Key extends keyof ListingFormState>(key: Key, value: ListingFormState[Key]) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value
    }));
  }

  function handleCountyChange(event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    const nextCountyId = event.target.value;

    setFormState((currentState) => ({
      ...currentState,
      countyId: nextCountyId,
      townId: "",
      areaId: ""
    }));
  }

  function handleTownChange(event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    const nextTownId = event.target.value;

    setFormState((currentState) => ({
      ...currentState,
      townId: nextTownId,
      areaId: ""
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    setProgress({
      stage: "saving",
      current: 0,
      total: Math.max(imageFiles.length, 1),
      percent: 0,
      message: "Creating listing"
    });

    try {
      const createdListing = await listingPublishingService.createListingWithImages(
        buildCreateListingInput(formState),
        imageFiles,
        {
          onProgress: setProgress
        }
      );

      if (!redirectOnSuccess) {
        const retainedLandlordId = requiresLandlordSelection ? formState.landlordId : "";
        setFormState(buildInitialFormState(retainedLandlordId, defaultBookingCapacityPerUnit));
        setImageFiles([]);
        setProgress(null);
        setSuccess("House created successfully.");
        await onCreated?.(createdListing);
        return;
      }

      await onCreated?.(createdListing);
      setSuccess("Listing published successfully. Redirecting to the live detail page...");
      router.replace(`/listing/${createdListing.id}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">{workspaceLabel} workspace</p>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>

          {!isSupabaseReady ? (
            <p className="rounded-xl border border-accent/35 bg-accent/15 px-3 py-2 text-[11px] text-accent-foreground">
              Supabase environment variables are missing, so listing publishing is currently disabled.
            </p>
          ) : null}

          {hasSeededLocations ? null : !isLocationLoading ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              No managed locations are available yet. {workspaceLabel === "Admin"
                ? "Create a county/town/area from the locations card first."
                : "Ask an admin to create the required location first."}
            </p>
          ) : null}

          {requiresLandlordSelection && !isLandlordLoading && landlordOptions.length === 0 ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              No landlord accounts are available yet. Assign landlord access in the admin users area before publishing houses.
            </p>
          ) : null}

          {success ? <p className="text-[11px] text-emerald-700">{success}</p> : null}
          {error ? <p className="text-[11px] text-rose-700">{error}</p> : null}
          {progress ? <p className="text-[11px] text-primary">{progress.message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {requiresLandlordSelection ? (
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="listing-landlord" className="text-[11px] font-medium text-foreground">
                Assigned landlord
              </label>
              <select
                id="listing-landlord"
                className={inputClassName}
                value={formState.landlordId}
                onChange={(event) => updateField("landlordId", event.target.value)}
                disabled={isSubmitting || !isSupabaseReady || isLandlordLoading || landlordOptions.length === 0}
                required
              >
                <option value="">
                  {landlordOptions.length > 0 ? "Select landlord" : "No landlord accounts available yet"}
                </option>
                {landlordOptions.map((landlord) => (
                  <option key={landlord.id} value={landlord.id}>
                    {landlord.fullName} ({landlord.email})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="listing-title" className="text-[11px] font-medium text-foreground">
              Title
            </label>
            <Input
              id="listing-title"
              value={formState.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Compact 2 bedroom near town"
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="listing-description" className="text-[11px] font-medium text-foreground">
              Description
            </label>
            <textarea
              id="listing-description"
              className={textareaClassName}
              value={formState.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Highlight the layout, utilities, access, and what makes the unit practical."
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="listing-type" className="text-[11px] font-medium text-foreground">
              Listing type
            </label>
            <select
              id="listing-type"
              className={inputClassName}
              value={formState.listingType}
              onChange={(event) => updateField("listingType", event.target.value as ListingType)}
              disabled={isSubmitting || !isSupabaseReady}
            >
              {Object.values(ListingType).map((value) => (
                <option key={value} value={value}>
                  {listingTypeLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="house-type" className="text-[11px] font-medium text-foreground">
              House type
            </label>
            <select
              id="house-type"
              className={inputClassName}
              value={formState.houseType}
              onChange={(event) => updateField("houseType", event.target.value as HouseType)}
              disabled={isSubmitting || !isSupabaseReady}
            >
              {Object.values(HouseType).map((value) => (
                <option key={value} value={value}>
                  {houseTypeLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="listing-price" className="text-[11px] font-medium text-foreground">
              Price (KES)
            </label>
            <Input
              id="listing-price"
              type="number"
              min="0"
              step="0.01"
              value={formState.price}
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="65000"
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="deposit-amount" className="text-[11px] font-medium text-foreground">
              Deposit amount
            </label>
            <Input
              id="deposit-amount"
              type="number"
              min="0"
              step="0.01"
              value={formState.depositAmount}
              onChange={(event) => updateField("depositAmount", event.target.value)}
              disabled={isSubmitting || !isSupabaseReady}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="total-units" className="text-[11px] font-medium text-foreground">
              Total units
            </label>
            <Input
              id="total-units"
              type="number"
              min="1"
              step="1"
              value={formState.totalUnits}
              onChange={(event) => updateField("totalUnits", event.target.value)}
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="available-units" className="text-[11px] font-medium text-foreground">
              Available units
            </label>
            <Input
              id="available-units"
              type="number"
              min="0"
              step="1"
              value={formState.availableUnits}
              onChange={(event) => updateField("availableUnits", event.target.value)}
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="hold-duration" className="text-[11px] font-medium text-foreground">
              Hold duration (hours)
            </label>
            <Input
              id="hold-duration"
              type="number"
              min="1"
              step="1"
              value={formState.holdDurationHours}
              onChange={(event) => updateField("holdDurationHours", event.target.value)}
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="booking-capacity-per-unit" className="text-[11px] font-medium text-foreground">
              Booking queue per unit
            </label>
            <Input
              id="booking-capacity-per-unit"
              type="number"
              min="1"
              step="1"
              value={formState.bookingCapacityPerUnit}
              onChange={(event) => updateField("bookingCapacityPerUnit", event.target.value)}
              disabled={isSubmitting || !isSupabaseReady}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              `1` means one active booking per available unit. Increase this if you want more people competing for each unit.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="available-from" className="text-[11px] font-medium text-foreground">
              Available from
            </label>
            <Input
              id="available-from"
              type="date"
              value={formState.availableFrom}
              onChange={(event) => updateField("availableFrom", event.target.value)}
              disabled={isSubmitting || !isSupabaseReady}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="maps-link" className="text-[11px] font-medium text-foreground">
              Maps link
            </label>
            <Input
              id="maps-link"
              value={formState.mapsLink}
              onChange={(event) => updateField("mapsLink", event.target.value)}
              placeholder="https://maps.google.com/..."
              disabled={isSubmitting || !isSupabaseReady}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="county-id" className="text-[11px] font-medium text-foreground">
              County
            </label>
            <select
              id="county-id"
              className={inputClassName}
              value={formState.countyId}
              onChange={handleCountyChange}
              disabled={isSubmitting || !isSupabaseReady || isLocationLoading || catalog.counties.length === 0}
              required
            >
              <option value="">{catalog.counties.length > 0 ? "Select county" : "No counties available yet"}</option>
              {catalog.counties.map((county) => (
                <option key={county.id} value={county.id}>
                  {county.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="town-id" className="text-[11px] font-medium text-foreground">
              Town
            </label>
            <select
              id="town-id"
              className={inputClassName}
              value={formState.townId}
              onChange={handleTownChange}
              disabled={
                isSubmitting ||
                !isSupabaseReady ||
                isLocationLoading ||
                !formState.countyId ||
                availableTowns.length === 0
              }
              required
            >
              <option value="">
                {!formState.countyId
                  ? "Select county first"
                  : availableTowns.length > 0
                    ? "Select town"
                    : "No towns available for this county"}
              </option>
              {availableTowns.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="area-id" className="text-[11px] font-medium text-foreground">
              Area
            </label>
            <select
              id="area-id"
              className={inputClassName}
              value={formState.areaId}
              onChange={(event) => updateField("areaId", event.target.value)}
              disabled={
                isSubmitting ||
                !isSupabaseReady ||
                isLocationLoading ||
                !formState.townId ||
                availableAreas.length === 0
              }
              required
            >
              <option value="">
                {!formState.townId
                  ? "Select town first"
                  : availableAreas.length > 0
                    ? "Select area"
                    : "No areas available for this town"}
              </option>
              {availableAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {formState.townId && availableAreas.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {workspaceLabel === "Admin"
                  ? "Create an area for this town in the locations card before publishing."
                  : "Ask an admin to create an area for this town before publishing."}
              </p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              disabled={isSubmitting || !isSupabaseReady}
            />
            Publish as active immediately
          </label>

          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground md:col-span-2">
            Active booking capacity is recalculated automatically as available units multiplied by the booking queue per unit.
          </div>
        </CardContent>
      </Card>

      <ImageUploadInput
        files={imageFiles}
        onChange={setImageFiles}
        disabled={isSubmitting || !isSupabaseReady}
        progress={progress}
        onValidationError={setError}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-[11px] text-muted-foreground", isLocationLoading ? "opacity-100" : "opacity-0")}>
          Loading location catalog...
        </p>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !isSupabaseReady ||
            isLocationLoading ||
            (requiresLandlordSelection && (isLandlordLoading || landlordOptions.length === 0 || !formState.landlordId)) ||
            catalog.counties.length === 0 ||
            availableAreas.length === 0
          }
        >
          {isSubmitting ? "Publishing..." : "Create listing"}
        </Button>
      </div>
    </form>
  );
}
