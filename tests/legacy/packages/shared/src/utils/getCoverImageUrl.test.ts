import { describe, it, expect } from "vitest";

import { getCoverImageUrl } from "./getCoverImageUrl";

describe("getCoverImageUrl", () => {
  it("returns the URL of the image with is_cover: true", () => {
    const images = [
      { url: "https://example.com/a.jpg", alt: "", sort_order: 0 },
      {
        url: "https://example.com/b.jpg",
        alt: "",
        sort_order: 1,
        is_cover: true,
      },
      { url: "https://example.com/c.jpg", alt: "", sort_order: 2 },
    ];
    expect(getCoverImageUrl(images)).toBe("https://example.com/b.jpg");
  });

  it("falls back to the first image when no cover is marked", () => {
    const images = [
      { url: "https://example.com/a.jpg", alt: "", sort_order: 0 },
      { url: "https://example.com/b.jpg", alt: "", sort_order: 1 },
    ];
    expect(getCoverImageUrl(images)).toBe("https://example.com/a.jpg");
  });

  it("returns null for an empty array", () => {
    expect(getCoverImageUrl([])).toBeNull();
  });

  it("returns null for non-array input", () => {
    expect(getCoverImageUrl(null)).toBeNull();
    expect(getCoverImageUrl(void 0)).toBeNull();
    expect(getCoverImageUrl("not-an-array")).toBeNull();
    expect(getCoverImageUrl(42)).toBeNull();
    expect(getCoverImageUrl({})).toBeNull();
  });

  it("handles string images", () => {
    const images = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
    expect(getCoverImageUrl(images)).toBe("https://example.com/a.jpg");
  });

  it("handles object images with url property", () => {
    const images = [{ url: "https://example.com/only.jpg" }];
    expect(getCoverImageUrl(images)).toBe("https://example.com/only.jpg");
  });

  it("returns null when the first element has no url and is not a string", () => {
    const images = [{ alt: "no url here" }];
    expect(getCoverImageUrl(images)).toBeNull();
  });

  it("ignores is_cover: false and falls back to first", () => {
    const images = [
      {
        url: "https://example.com/a.jpg",
        alt: "",
        sort_order: 0,
        is_cover: false,
      },
      {
        url: "https://example.com/b.jpg",
        alt: "",
        sort_order: 1,
        is_cover: false,
      },
    ];
    expect(getCoverImageUrl(images)).toBe("https://example.com/a.jpg");
  });
});
