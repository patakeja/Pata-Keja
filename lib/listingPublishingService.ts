import { imageService } from "@/lib/imageService";
import { listingService } from "@/lib/listingService";
import { ListingPublishingService } from "@/services/listings/listing-publishing.service";

export const listingPublishingService = new ListingPublishingService(listingService, imageService);
