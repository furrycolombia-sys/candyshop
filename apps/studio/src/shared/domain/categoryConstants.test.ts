import { describe, it, expect } from "vitest";

import {
  getCategoryTheme,
  CATEGORY_THEMES,
  CATEGORY_HERO_BG,
  CATEGORY_BADGE_STYLES,
  getCategoryBadgeStyle,
} from "./categoryConstants";

describe("CATEGORY_THEMES", () => {
  it("has a theme for all six categories", () => {
    const categories = [
      "fursuits",
      "merch",
      "art",
      "events",
      "digital",
      "deals",
    ] as const;

    for (const cat of categories) {
      const theme = CATEGORY_THEMES[cat];
      expect(theme).toBeDefined();
      expect(theme.bg).toContain("bg-");
      expect(theme.bgLight).toContain("bg-");
      expect(theme.border).toContain("border-");
      expect(theme.text).toContain("text-");
      expect(theme.badgeBg).toContain("bg-");
    }
  });
});

describe("getCategoryTheme", () => {
  it("returns the correct theme for fursuits", () => {
    const theme = getCategoryTheme("fursuits");
    expect(theme.bg).toBe("bg-pink");
    expect(theme.text).toBe("text-pink");
  });

  it("returns the correct theme for digital", () => {
    const theme = getCategoryTheme("digital");
    expect(theme.bg).toBe("bg-sky");
  });

  it("falls back to merch for unknown categories", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const theme = getCategoryTheme("unknown" as any);
    expect(theme).toEqual(CATEGORY_THEMES.merch);
  });
});

describe("CATEGORY_HERO_BG", () => {
  it("maps all categories to bg opacity classes", () => {
    const categories = [
      "fursuits",
      "merch",
      "art",
      "events",
      "digital",
      "deals",
    ] as const;

    for (const cat of categories) {
      expect(CATEGORY_HERO_BG[cat]).toContain("bg-");
      expect(CATEGORY_HERO_BG[cat]).toContain("/15");
    }
  });
});

describe("getCategoryBadgeStyle", () => {
  it("returns style for known categories", () => {
    const style = getCategoryBadgeStyle("art");
    expect(style).toContain("bg-lilac");
    expect(style).toContain("text-lilac");
  });

  it("falls back to merch for unknown categories", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const style = getCategoryBadgeStyle("unknown" as any);
    expect(style).toEqual(CATEGORY_BADGE_STYLES.merch);
  });
});
