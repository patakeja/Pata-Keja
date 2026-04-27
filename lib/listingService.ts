import { PlaceholderListingRepository } from "@/services/listings/listing.repository";
import { ListingService } from "@/services/listings/listing.service";

const listingRepository = new PlaceholderListingRepository();

export const listingService = new ListingService(listingRepository);
