/** Parse comma-separated tag string into an array of trimmed, non-empty tags */
export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
