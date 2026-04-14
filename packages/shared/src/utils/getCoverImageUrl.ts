/**
 * Returns the URL of the cover image from a product's images array.
 *
 * Finds the image with `is_cover: true`, or falls back to the first image.
 * Handles both string images and object images with a `url` property.
 *
 * @param images - Raw images value (typically JSONB from Supabase)
 * @returns The cover image URL, or null if images is empty/invalid
 */
export function getCoverImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  const coverImage =
    (images as { is_cover?: boolean }[]).find((img) => img.is_cover === true) ??
    images[0];

  if (typeof coverImage === "string") return coverImage;
  if (coverImage && typeof coverImage === "object" && "url" in coverImage) {
    return String((coverImage as { url: string }).url);
  }
  return null;
}
