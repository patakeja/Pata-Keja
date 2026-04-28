export const LISTING_IMAGE_BUCKET = "listing-images";
export const LISTING_IMAGE_OUTPUT_MIME_TYPE = "image/jpeg";
export const LISTING_IMAGE_MAX_COUNT = 10;
export const LISTING_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const LISTING_IMAGE_MAX_WIDTH = 1280;
export const LISTING_IMAGE_QUALITY = 0.7;
export const LISTING_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const LISTING_IMAGE_ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"] as const;
export const LISTING_IMAGE_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;
