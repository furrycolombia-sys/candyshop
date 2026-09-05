import { describe, it, expect } from "vitest";

import { toYouTubeEmbedUrl } from "./youtubeEmbed";

const BASE = "https://www.youtube.com/embed/";

describe("toYouTubeEmbedUrl", () => {
  it("returns null for empty string", () => {
    expect(toYouTubeEmbedUrl("")).toBeNull();
  });

  it("returns null for non-YouTube URL", () => {
    expect(toYouTubeEmbedUrl("https://vimeo.com/123456")).toBeNull();
  });

  it("returns null for arbitrary string", () => {
    expect(toYouTubeEmbedUrl("not a url")).toBeNull();
  });

  it("converts watch URL to embed URL", () => {
    expect(toYouTubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      `${BASE}abc123`,
    );
  });

  it("converts watch URL with extra query params", () => {
    expect(
      toYouTubeEmbedUrl(
        "https://www.youtube.com/watch?list=PLxxx&v=xyz789&t=30",
      ),
    ).toBe(`${BASE}xyz789`);
  });

  it("converts youtu.be short URL", () => {
    expect(toYouTubeEmbedUrl("https://youtu.be/abc123")).toBe(`${BASE}abc123`);
  });

  it("returns embed URL as-is when already in embed form", () => {
    const embedUrl = `${BASE}abc123`;
    expect(toYouTubeEmbedUrl(embedUrl)).toBe(embedUrl);
  });

  it("handles embed URL with http scheme", () => {
    expect(toYouTubeEmbedUrl("https://www.youtube.com/embed/abc123")).toBe(
      `${BASE}abc123`,
    );
  });

  it("handles video IDs with hyphens and underscores", () => {
    expect(toYouTubeEmbedUrl("https://youtu.be/abc-123_XYZ")).toBe(
      `${BASE}abc-123_XYZ`,
    );
  });
});
