import { ListingService } from "@/services/listings/listing.service";
import { ImageService } from "@/services/storage/image.service";
import type { CreateListingInput, ListingPublishProgress, ListingRecord } from "@/types";

type ListingPublishingOptions = {
  onProgress?: (progress: ListingPublishProgress) => void;
};

export class ListingPublishingService {
  constructor(
    private readonly listingService: ListingService,
    private readonly imageService: ImageService
  ) {}

  async createListingWithImages(
    input: CreateListingInput,
    files: File[],
    options?: ListingPublishingOptions
  ): Promise<ListingRecord> {
    const createdListing = await this.listingService.createListing(input);

    if (files.length === 0) {
      return createdListing;
    }

    let uploadedPaths: string[] = [];

    try {
      uploadedPaths = await this.imageService.uploadListingImages(createdListing.id, files, {
        onProgress: (progress) => {
          options?.onProgress?.({
            ...progress,
            message:
              progress.stage === "compressing"
                ? `Compressing ${progress.fileName}`
                : `Uploading ${progress.fileName}`
          });
        }
      });

      options?.onProgress?.({
        stage: "saving",
        current: files.length,
        total: files.length,
        percent: 100,
        message: "Saving image metadata"
      });

      return this.listingService.updateListingImages(createdListing.id, {
        imagePaths: uploadedPaths,
        coverImagePath: uploadedPaths[0] ?? null
      });
    } catch (error) {
      if (uploadedPaths.length > 0) {
        try {
          await this.imageService.deleteListingImages(uploadedPaths);
        } catch {
          // Ignore cleanup failures so the root upload error remains visible to the caller.
        }
      }

      throw error;
    }
  }
}
