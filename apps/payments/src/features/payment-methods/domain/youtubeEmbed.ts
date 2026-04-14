/**
 * Convert a YouTube URL to its embed form.
 *
 * Handles:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID  (already embedded — returned as-is)
 *
 * Returns null for any unrecognised URL.
 */
export function toYouTubeEmbedUrl(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  // Already an embed URL
  const embedMatch = input.match(
    /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]+)/,
  );
  if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  // https://www.youtube.com/watch?v=ID
  const watchMatch = input.match(/youtube\.com\/watch\?(?:[^&]*&)*v=([\w-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  // https://youtu.be/ID
  const shortMatch = input.match(/^https?:\/\/youtu\.be\/([\w-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  return null;
}
