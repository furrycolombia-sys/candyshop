import { describe, it, expect } from "vitest";

import { DEFAULT_ICON_NAME, getIcon, ICON_MAP } from "./lucideIconMap";

describe("lucideIconMap", () => {
  it("returns known icon by name", () => {
    const icon = getIcon("Shield");
    expect(icon).toBe(ICON_MAP.Shield);
  });

  it("returns Sparkles as default for unknown icon", () => {
    const icon = getIcon("NonExistentIcon");
    expect(icon).toBe(ICON_MAP.Sparkles);
  });

  it("exports DEFAULT_ICON_NAME as Sparkles", () => {
    expect(DEFAULT_ICON_NAME).toBe("Sparkles");
  });

  it("contains expected icons", () => {
    const expectedIcons = [
      "Sparkles",
      "Shield",
      "Clock",
      "Star",
      "Heart",
      "Zap",
      "Palette",
      "Music",
      "Download",
      "MapPin",
      "Users",
      "Award",
      "Wind",
      "Package",
      "Brush",
      "Image",
      "FileText",
      "Truck",
    ];
    for (const name of expectedIcons) {
      expect(ICON_MAP[name]).toBeDefined();
    }
  });
});
