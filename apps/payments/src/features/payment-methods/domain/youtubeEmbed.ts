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
const YOUTUBE_EMBED_BASE = "https://www.youtube.com/embed/";

export function toYouTubeEmbedUrl(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  // Already an embed URL
  const embedMatch = input.match(
    /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]+)/,
  );
  if (embedMatch) return `${YOUTUBE_EMBED_BASE}${embedMatch[1]}`;

  // https://www.youtube.com/watch?v=ID
  const watchMatch = input.match(/youtube\.com\/watch\?(?:[^&]*&)*v=([\w-]+)/);
  if (watchMatch) return `${YOUTUBE_EMBED_BASE}${watchMatch[1]}`;

  // https://youtu.be/ID
  const shortMatch = input.match(/^https?:\/\/youtu\.be\/([\w-]+)/);
  if (shortMatch) return `${YOUTUBE_EMBED_BASE}${shortMatch[1]}`;

  return null;
}
