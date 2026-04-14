import { describe, it, expect } from "vitest";

import { SECTION_TYPES } from "./sections";

describe("SECTION_TYPES", () => {
  it("contains exactly the expected section types", () => {
    expect(SECTION_TYPES).toEqual([
      "cards",
      "accordion",
      "two-column",
      "gallery",
    ]);
  });

  it("has 4 section types", () => {
    expect(SECTION_TYPES).toHaveLength(4);
  });

  it("includes 'cards'", () => {
    expect(SECTION_TYPES).toContain("cards");
  });

  it("includes 'accordion'", () => {
    expect(SECTION_TYPES).toContain("accordion");
  });

  it("includes 'two-column'", () => {
    expect(SECTION_TYPES).toContain("two-column");
  });

  it("includes 'gallery'", () => {
    expect(SECTION_TYPES).toContain("gallery");
  });
});
