import type { ListingDetail, ListingPreview } from "@/types";
import { getPlaceholderListingById, getPlaceholderListings } from "@/services/mock/placeholder-data";

export interface ListingRepository {
  getPublicListings(): Promise<ListingPreview[]>;
  getPublicListingById(id: string): Promise<ListingDetail | null>;
}

export class PlaceholderListingRepository implements ListingRepository {
  async getPublicListings() {
    return getPlaceholderListings();
  }

  async getPublicListingById(id: string) {
    return getPlaceholderListingById(id);
  }
}
