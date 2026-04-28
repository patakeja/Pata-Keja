"use client";

import { useEffect, useState, type DragEvent, type ChangeEvent } from "react";

import { LISTING_IMAGE_MAX_COUNT, LISTING_IMAGE_MAX_SIZE_BYTES } from "@/config/storage";
import { imageService } from "@/lib/imageService";
import { cn } from "@/lib/utils";
import type { ListingPublishProgress } from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ImageUploadInputProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  progress?: ListingPublishProgress | null;
  onValidationError?: (message: string | null) => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not process those images.";
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function ImageUploadInput({
  files,
  onChange,
  disabled = false,
  progress,
  onValidationError
}: ImageUploadInputProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const nextPreviewUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextPreviewUrls);

    return () => {
      nextPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function reportValidationError(message: string | null) {
    setLocalError(message);
    onValidationError?.(message);
  }

  function updateFiles(nextFiles: File[]) {
    reportValidationError(null);
    onChange(nextFiles);
  }

  function appendFiles(nextFiles: File[]) {
    try {
      const existingKeys = new Set(files.map((file) => getFileKey(file)));
      const mergedFiles = [
        ...files,
        ...nextFiles.filter((file) => {
          const fileKey = getFileKey(file);

          if (existingKeys.has(fileKey)) {
            return false;
          }

          existingKeys.add(fileKey);
          return true;
        })
      ];

      imageService.validateListingImageSelection(mergedFiles);
      updateFiles(mergedFiles);
    } catch (error) {
      reportValidationError(getErrorMessage(error));
    }
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];

    if (selectedFiles.length > 0) {
      appendFiles(selectedFiles);
    }

    event.target.value = "";
  }

  function handleDropzoneDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDropActive(false);

    const droppedFiles = Array.from(event.dataTransfer.files);

    if (droppedFiles.length > 0) {
      appendFiles(droppedFiles);
    }
  }

  function handleInternalDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    const nextFiles = [...files];
    const [draggedFile] = nextFiles.splice(draggedIndex, 1);
    nextFiles.splice(targetIndex, 0, draggedFile);
    setDraggedIndex(null);
    updateFiles(nextFiles);
  }

  function makeCover(index: number) {
    if (index === 0) {
      return;
    }

    const nextFiles = [...files];
    const [selectedFile] = nextFiles.splice(index, 1);
    nextFiles.unshift(selectedFile);
    updateFiles(nextFiles);
  }

  function moveFile(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= files.length) {
      return;
    }

    const nextFiles = [...files];
    const [selectedFile] = nextFiles.splice(index, 1);
    nextFiles.splice(nextIndex, 0, selectedFile);
    updateFiles(nextFiles);
  }

  function removeFile(index: number) {
    updateFiles(files.filter((_, fileIndex) => fileIndex !== index));
  }

  const uploadMessage = progress
    ? `${progress.message} ${progress.current}/${progress.total}${progress.percent ? ` (${progress.percent}%)` : ""}`
    : null;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Listing images</h3>
            <p className="text-[11px] text-muted-foreground">
              Up to {LISTING_IMAGE_MAX_COUNT} JPG or PNG files, {Math.floor(LISTING_IMAGE_MAX_SIZE_BYTES / (1024 * 1024))}
              MB max before compression.
            </p>
          </div>
          <Badge>{files.length}/{LISTING_IMAGE_MAX_COUNT}</Badge>
        </div>

        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center transition",
            isDropActive ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-primary/5",
            disabled ? "cursor-not-allowed opacity-60" : ""
          )}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) {
              setIsDropActive(true);
            }
          }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDropzoneDrop}
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleFileSelection}
            disabled={disabled || files.length >= LISTING_IMAGE_MAX_COUNT}
          />
          <span className="text-xs font-medium text-foreground">Drop images here or tap to browse</span>
          <span className="mt-1 text-[11px] text-muted-foreground">Drag thumbnails below to reorder the gallery.</span>
        </label>

        {files.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {files.map((file, index) => (
              <div
                key={getFileKey(file)}
                className="space-y-2 rounded-md border border-border bg-white p-2"
                draggable={!disabled}
                onDragStart={() => setDraggedIndex(index)}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleInternalDrop(index);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrls[index]}
                  alt={file.name}
                  className="h-24 w-full rounded-md object-cover"
                  loading="lazy"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {index === 0 ? <Badge>Cover</Badge> : null}
                    <span className="truncate text-[11px] font-medium text-foreground">{file.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.max(1, Math.round(file.size / 1024))} KB
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => makeCover(index)}
                    disabled={disabled || index === 0}
                  >
                    Cover
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => moveFile(index, -1)}
                    disabled={disabled || index === 0}
                  >
                    Left
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => moveFile(index, 1)}
                    disabled={disabled || index === files.length - 1}
                  >
                    Right
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {uploadMessage ? <p className="text-[11px] text-primary">{uploadMessage}</p> : null}
        {localError ? <p className="text-[11px] text-rose-700">{localError}</p> : null}
      </CardContent>
    </Card>
  );
}
