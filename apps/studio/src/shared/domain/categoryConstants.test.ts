import { describe, it, expect } from "vitest";

import { CATEGORY_THEMES, getCategoryTheme } from "./categoryConstants";

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
      expect(theme.bg).toContain("var(--");
      expect(theme.bgLight).toContain("color-mix(");
      expect(theme.border).toContain("var(--");
      expect(theme.text).toContain("var(--");
      expect(theme.badgeBg).toContain("var(--");
      expect(theme.rowEven).toContain("color-mix(");
      expect(theme.rowOdd).toContain("color-mix(");
      expect(theme.accent).toContain("--");
    }
  });
});

describe("getCategoryTheme", () => {
  it("returns the correct theme for fursuits", () => {
    const theme = getCategoryTheme("fursuits");
    expect(theme.bg).toBe("var(--pink)");
    expect(theme.text).toBe("var(--pink)");
  });

  it("returns the correct theme for digital", () => {
    const theme = getCategoryTheme("digital");
    expect(theme.bg).toBe("var(--sky)");
  });

  it("falls back to merch for unknown categories", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const theme = getCategoryTheme("unknown" as any);
    expect(theme).toEqual(CATEGORY_THEMES.merch);
  });
});
