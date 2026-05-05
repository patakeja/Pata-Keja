"use client";

import { useEffect, useState, type FormEvent } from "react";

import type {
  LandlordHouseRecord,
  ListingPublishProgress,
  UpdateLandlordListingInput
} from "@/types";

import { ImageUploadInput } from "@/components/features/listings/image-upload-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type LandlordHouseEditorSubmitPayload = {
  input: UpdateLandlordListingInput;
  replaceGallery: boolean;
  files: File[];
};

type EditFormState = {
  title: string;
  description: string;
  price: string;
  totalUnits: string;
  availableUnits: string;
  bookingCapacityPerUnit: string;
  depositAmount: string;
  holdDurationHours: string;
  availableFrom: string;
  mapsLink: string;
  isActive: boolean;
};

type LandlordHouseEditorProps = {
  house: LandlordHouseRecord;
  isSaving: boolean;
  error: string | null;
  progress: ListingPublishProgress | null;
  onClose: () => void;
  onSubmit: (payload: LandlordHouseEditorSubmitPayload) => void | Promise<void>;
};

function buildFormState(house: LandlordHouseRecord): EditFormState {
  return {
    title: house.title,
    description: house.description,
    price: String(house.price),
    totalUnits: String(house.totalUnits),
    availableUnits: String(house.availableUnits),
    bookingCapacityPerUnit: String(house.bookingCapacityPerUnit),
    depositAmount: String(house.depositAmount),
    holdDurationHours: String(house.holdDurationHours),
    availableFrom: house.availableFrom ?? "",
    mapsLink: house.mapsLink ?? "",
    isActive: house.isActive
  };
}

export function LandlordHouseEditor({
  house,
  isSaving,
  error,
  progress,
  onClose,
  onSubmit
}: LandlordHouseEditorProps) {
  const [formState, setFormState] = useState<EditFormState>(() => buildFormState(house));
  const [files, setFiles] = useState<File[]>([]);
  const [replaceGallery, setReplaceGallery] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setFormState(buildFormState(house));
    setFiles([]);
    setReplaceGallery(false);
    setValidationError(null);
  }, [house]);

  function updateField<Key extends keyof EditFormState>(key: Key, value: EditFormState[Key]) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    onSubmit({
      input: {
        title: formState.title,
        description: formState.description,
        price: Number(formState.price),
        totalUnits: Number(formState.totalUnits),
        availableUnits: Number(formState.availableUnits),
        bookingCapacityPerUnit: Number(formState.bookingCapacityPerUnit),
        depositAmount: Number(formState.depositAmount),
        holdDurationHours: Number(formState.holdDurationHours),
        availableFrom: formState.availableFrom.trim() || null,
        mapsLink: formState.mapsLink.trim() || null,
        isActive: formState.isActive
      },
      replaceGallery,
      files
    });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 p-3">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Edit house</h2>
            <p className="text-[11px] text-muted-foreground">{house.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-foreground">Title</label>
                <Input
                  value={formState.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-foreground">Basic info</label>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  value={formState.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Price (KES)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Available from</label>
                <Input
                  type="date"
                  value={formState.availableFrom}
                  onChange={(event) => updateField("availableFrom", event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Total units</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formState.totalUnits}
                  onChange={(event) => updateField("totalUnits", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Available units</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.availableUnits}
                  onChange={(event) => updateField("availableUnits", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Booking queue per unit</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formState.bookingCapacityPerUnit}
                  onChange={(event) => updateField("bookingCapacityPerUnit", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Deposit amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.depositAmount}
                  onChange={(event) => updateField("depositAmount", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Hold duration (hours)</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formState.holdDurationHours}
                  onChange={(event) => updateField("holdDurationHours", event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground md:col-span-2">
                Active booking capacity is recalculated from available units multiplied by the booking queue per unit.
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-foreground">Maps link</label>
                <Input
                  value={formState.mapsLink}
                  onChange={(event) => updateField("mapsLink", event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground md:col-span-2">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) => updateField("isActive", event.target.checked)}
                  disabled={isSaving}
                />
                Keep this listing active
              </label>
            </div>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Current gallery</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Replace the gallery only when you are ready. The first uploaded image becomes the cover.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={replaceGallery ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setReplaceGallery((currentState) => !currentState)}
                    disabled={isSaving}
                  >
                    {replaceGallery ? "Replacing gallery" : "Replace gallery"}
                  </Button>
                </div>

                {house.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {house.images.slice(0, 8).map((image) => (
                      <div key={image.id} className="overflow-hidden rounded-md border border-border bg-white">
                        {image.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image.signedUrl}
                            alt={house.title}
                            className="h-20 w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-20 w-full bg-muted" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No gallery images stored yet.</p>
                )}
              </CardContent>
            </Card>

            {replaceGallery ? (
              <ImageUploadInput
                files={files}
                onChange={setFiles}
                disabled={isSaving}
                progress={progress}
                onValidationError={setValidationError}
              />
            ) : null}

            {house.needsImageRefresh ? (
              <p className="rounded-xl border border-accent/35 bg-accent/15 px-3 py-2 text-[11px] text-accent-foreground">
                Consider updating images. This listing has gone a while without a gallery refresh.
              </p>
            ) : null}

            {validationError ? <p className="text-xs text-rose-700">{validationError}</p> : null}
            {error ? <p className="text-xs text-rose-700">{error}</p> : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
