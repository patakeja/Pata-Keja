import { SUPPORTED_LISTING_TYPES } from "@/config/app";
import type { ListingRepository } from "@/services/listings/listing.repository";

export class ListingService {
  constructor(private readonly repository: ListingRepository) {}

  async getPublicListings() {
    return this.repository.getPublicListings();
  }

  async getPublicListingById(id: string) {
    return this.repository.getPublicListingById(id);
  }

  getSupportedListingTypes() {
    return [...SUPPORTED_LISTING_TYPES];
  }
}
