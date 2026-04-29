import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LISTING_IMAGE_ALLOWED_EXTENSIONS,
  LISTING_IMAGE_ALLOWED_MIME_TYPES,
  LISTING_IMAGE_BUCKET,
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_MAX_SIZE_BYTES,
  LISTING_IMAGE_MAX_WIDTH,
  LISTING_IMAGE_OUTPUT_MIME_TYPE,
  LISTING_IMAGE_QUALITY,
  LISTING_IMAGE_SIGNED_URL_TTL_SECONDS
} from "@/config/storage";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import { ServiceErrorCode, type ListingImageUploadProgress } from "@/types";

type ServiceClient = SupabaseClient<Database>;
type UploadImageOptions = {
  onProgress?: (progress: ListingImageUploadProgress) => void;
};

export class ImageService {
  constructor(private readonly clientFactory?: () => ServiceClient) {}

  getBucketName() {
    return LISTING_IMAGE_BUCKET;
  }

  getMaxImageCount() {
    return LISTING_IMAGE_MAX_COUNT;
  }

  getMaxFileSizeBytes() {
    return LISTING_IMAGE_MAX_SIZE_BYTES;
  }

  getAllowedMimeTypes() {
    return [...LISTING_IMAGE_ALLOWED_MIME_TYPES];
  }

  validateListingImageSelection(files: File[], existingCount = 0) {
    if (existingCount + files.length > LISTING_IMAGE_MAX_COUNT) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        `You can upload up to ${LISTING_IMAGE_MAX_COUNT} images per listing.`
      );
    }

    files.forEach((file) => this.assertValidImageFile(file));

    return files;
  }

  normalizeStoredPaths(paths: string[]) {
    return [...new Set(paths.map((path) => this.normalizeStoredPath(path)).filter(Boolean))];
  }

  async compressImage(file: File, onProgress?: (percent: number) => void): Promise<File> {
    this.assertValidImageFile(file);

    const compressionModule = await import("browser-image-compression");
    const imageCompression = compressionModule.default;
    const compressedBlob = await imageCompression(file, {
      maxWidthOrHeight: LISTING_IMAGE_MAX_WIDTH,
      initialQuality: LISTING_IMAGE_QUALITY,
      fileType: LISTING_IMAGE_OUTPUT_MIME_TYPE,
      useWebWorker: false,
      onProgress: (progress) => {
        if (onProgress) {
          onProgress(Math.max(0, Math.min(100, Math.round(progress))));
        }
      }
    });

    return new File([compressedBlob], this.toOutputFileName(file.name), {
      type: LISTING_IMAGE_OUTPUT_MIME_TYPE,
      lastModified: Date.now()
    });
  }

  async uploadListingImages(
    listingId: string,
    files: File[],
    options?: UploadImageOptions
  ): Promise<string[]> {
    const client = this.resolveClient();
    const normalizedListingId = listingId.trim();

    if (!normalizedListingId) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "A listing ID is required before uploading images.");
    }

    this.validateListingImageSelection(files);

    if (files.length === 0) {
      return [];
    }

    const uploadedPaths: string[] = [];
    const batchTimestamp = Date.now();

    try {
      for (const [index, file] of files.entries()) {
        const current = index + 1;

        const compressedFile = await this.compressImage(file, (percent) => {
          options?.onProgress?.({
            stage: "compressing",
            current,
            total: files.length,
            fileName: file.name,
            percent
          });
        });

        const storedPath = this.normalizeStoredPath(
          `${LISTING_IMAGE_BUCKET}/${normalizedListingId}/${batchTimestamp}-${index}.jpg`
        );

        options?.onProgress?.({
          stage: "uploading",
          current,
          total: files.length,
          fileName: file.name,
          percent: 0
        });

        const { error } = await client.storage
          .from(LISTING_IMAGE_BUCKET)
          .upload(this.toBucketRelativePath(storedPath), compressedFile, {
            cacheControl: "3600",
            contentType: LISTING_IMAGE_OUTPUT_MIME_TYPE,
            upsert: false
          });

        if (error) {
          throw new ServiceError(
            ServiceErrorCode.STORAGE_ERROR,
            error.message?.trim()
              ? `Unable to upload ${file.name}: ${error.message}`
              : "Unable to upload one or more listing images.",
            error
          );
        }

        uploadedPaths.push(storedPath);

        options?.onProgress?.({
          stage: "uploading",
          current,
          total: files.length,
          fileName: file.name,
          percent: 100
        });
      }
    } catch (error) {
      if (uploadedPaths.length > 0) {
        try {
          await this.removeListingImages(uploadedPaths, client);
        } catch {
          // Ignore cleanup failures so the original upload error remains visible.
        }
      }

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(ServiceErrorCode.STORAGE_ERROR, "Unable to upload listing images.", error);
    }

    return uploadedPaths;
  }

  async getSignedImageUrls(paths: string[]): Promise<string[]> {
    const normalizedPaths = this.normalizeStoredPaths(paths);
    const signedUrlMap = await this.getSignedImageUrlMap(normalizedPaths);

    return normalizedPaths.map((path) => signedUrlMap[path]).filter((value): value is string => Boolean(value));
  }

  async getSignedImageUrlMap(paths: string[], client?: ServiceClient): Promise<Record<string, string>> {
    const supabase = this.resolveClient(client);
    const normalizedPaths = this.normalizeStoredPaths(paths);

    if (normalizedPaths.length === 0) {
      return {};
    }

    const externalPaths = normalizedPaths.filter((path) => this.isAbsoluteUrl(path));
    const bucketPaths = normalizedPaths.filter((path) => !this.isAbsoluteUrl(path));
    const signedUrlMap: Record<string, string> = {};

    externalPaths.forEach((path) => {
      signedUrlMap[path] = path;
    });

    if (bucketPaths.length === 0) {
      return signedUrlMap;
    }

    const { data, error } = await supabase.storage
      .from(LISTING_IMAGE_BUCKET)
      .createSignedUrls(
        bucketPaths.map((path) => this.toBucketRelativePath(path)),
        LISTING_IMAGE_SIGNED_URL_TTL_SECONDS
      );

    if (error) {
      throw new ServiceError(ServiceErrorCode.STORAGE_ERROR, "Unable to generate signed image URLs.", error);
    }

    data.forEach((item, index) => {
      if (item.signedUrl) {
        signedUrlMap[bucketPaths[index]] = item.signedUrl;
      }
    });

    return signedUrlMap;
  }

  async deleteListingImages(paths: string[]): Promise<void> {
    const client = this.resolveClient();
    await this.removeListingImages(paths, client);
  }

  private async removeListingImages(paths: string[], client: ServiceClient) {
    const bucketPaths = this.normalizeStoredPaths(paths).filter((path) => !this.isAbsoluteUrl(path));

    if (bucketPaths.length === 0) {
      return;
    }

    const { error } = await client.storage
      .from(LISTING_IMAGE_BUCKET)
      .remove(bucketPaths.map((path) => this.toBucketRelativePath(path)));

    if (error) {
      throw new ServiceError(ServiceErrorCode.STORAGE_ERROR, "Unable to delete listing images.", error);
    }
  }

  private resolveClient(client?: ServiceClient) {
    if (client) {
      return client;
    }

    if (!this.clientFactory) {
      throw new ServiceError(ServiceErrorCode.CONFIG_ERROR, "Supabase client factory is not configured.");
    }

    return this.clientFactory();
  }

  private assertValidImageFile(file: File) {
    if (file.size > LISTING_IMAGE_MAX_SIZE_BYTES) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        `${file.name} exceeds the ${Math.floor(LISTING_IMAGE_MAX_SIZE_BYTES / (1024 * 1024))}MB limit.`
      );
    }

    const normalizedName = file.name.toLowerCase();
    const isAllowedType = LISTING_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as (typeof LISTING_IMAGE_ALLOWED_MIME_TYPES)[number]);
    const hasAllowedExtension = LISTING_IMAGE_ALLOWED_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));

    if (!isAllowedType && !hasAllowedExtension) {
      throw new ServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        `${file.name} must be a JPG or PNG image.`
      );
    }
  }

  private normalizeStoredPath(path: string) {
    const trimmedPath = path.trim();

    if (!trimmedPath) {
      return "";
    }

    if (this.isAbsoluteUrl(trimmedPath)) {
      return trimmedPath;
    }

    const normalizedPath = trimmedPath.replace(/^\/+/, "");

    if (normalizedPath.startsWith(`${LISTING_IMAGE_BUCKET}/`)) {
      return normalizedPath;
    }

    return `${LISTING_IMAGE_BUCKET}/${normalizedPath}`;
  }

  private toBucketRelativePath(path: string) {
    if (!path.startsWith(`${LISTING_IMAGE_BUCKET}/`)) {
      return path.replace(/^\/+/, "");
    }

    return path.slice(LISTING_IMAGE_BUCKET.length + 1);
  }

  private toOutputFileName(fileName: string) {
    const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "listing-image";
    return `${baseName}.jpg`;
  }

  private isAbsoluteUrl(path: string) {
    return /^https?:\/\//i.test(path);
  }
}
