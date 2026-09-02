import { describe, it, expect } from "vitest";

import {
  CATEGORY_THEMES,
  PRODUCT_CATEGORIES,
  getCategoryColor,
  getCategoryTheme,
} from "@/shared/domain/categoryConstants";
import type { ProductCategory } from "@/shared/domain/CategoryTypes";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CATEGORY_THEMES", () => {
  const allCategories: ProductCategory[] = [
    "fursuits",
    "merch",
    "art",
    "events",
    "digital",
    "deals",
  ];

  it("has a theme entry for every product category", () => {
    for (const cat of allCategories) {
      expect(CATEGORY_THEMES[cat]).toBeDefined();
    }
  });

  it.each(allCategories)("theme for '%s' has all required keys", (cat) => {
    const theme = CATEGORY_THEMES[cat];
    expect(theme).toHaveProperty("bg");
    expect(theme).toHaveProperty("bgLight");
    expect(theme).toHaveProperty("border");
    expect(theme).toHaveProperty("text");
    expect(theme).toHaveProperty("badgeBg");
    expect(theme).toHaveProperty("rowEven");
    expect(theme).toHaveProperty("rowOdd");
    expect(theme).toHaveProperty("accent");
  });

  it("generates CSS variable-driven theme values", () => {
    const theme = CATEGORY_THEMES.fursuits;
    expect(theme.bg).toBe("var(--pink)");
    expect(theme.bgLight).toContain("color-mix(");
    expect(theme.border).toBe("var(--pink)");
    expect(theme.text).toBe("var(--pink)");
  });
});

describe("PRODUCT_CATEGORIES", () => {
  it("has 6 entries matching all category values", () => {
    expect(PRODUCT_CATEGORIES).toHaveLength(6);
    const values = PRODUCT_CATEGORIES.map((c) => c.value);
    expect(values).toContain("fursuits");
    expect(values).toContain("merch");
    expect(values).toContain("art");
    expect(values).toContain("events");
    expect(values).toContain("digital");
    expect(values).toContain("deals");
  });

  it("each entry has a color derived from CATEGORY_THEMES", () => {
    for (const entry of PRODUCT_CATEGORIES) {
      expect(entry.color).toBe(CATEGORY_THEMES[entry.value].bg);
    }
  });
});

describe("getCategoryTheme", () => {
  it("returns the theme for a known category", () => {
    const theme = getCategoryTheme("fursuits");
    expect(theme).toBe(CATEGORY_THEMES.fursuits);
  });

  it("returns different themes for different categories", () => {
    expect(getCategoryTheme("art")).not.toBe(getCategoryTheme("merch"));
  });
});

describe("getCategoryColor", () => {
  it("returns the bg color for a known category", () => {
    expect(getCategoryColor("fursuits")).toBe(CATEGORY_THEMES.fursuits.bg);
  });

  it("returns merch bg as default for unknown category", () => {
    expect(getCategoryColor("nonexistent")).toBe(CATEGORY_THEMES.merch.bg);
  });

  it("returns merch bg for empty string", () => {
    expect(getCategoryColor("")).toBe(CATEGORY_THEMES.merch.bg);
  });
});
