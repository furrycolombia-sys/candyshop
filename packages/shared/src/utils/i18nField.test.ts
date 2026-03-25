import { describe, it, expect } from "vitest";

import { i18nField } from "./i18nField";

describe("i18nField", () => {
  const row = {
    name_en: "Fursuit Head",
    name_es: "Cabeza de Fursuit",
    description_en: "A custom fursuit head",
    tagline_es: "Solo en español",
  };

  it("returns the field for the requested locale", () => {
    expect(i18nField(row, "name", "en")).toBe("Fursuit Head");
  });

  it("returns the field for a non-English locale", () => {
    expect(i18nField(row, "name", "es")).toBe("Cabeza de Fursuit");
  });

  it("falls back to English when the locale field is missing", () => {
    expect(i18nField(row, "description", "es")).toBe("A custom fursuit head");
  });

  it("falls back to Spanish when English is missing", () => {
    expect(i18nField(row, "tagline", "en")).toBe("Solo en español");
  });

  it("returns Spanish field when requested in Spanish", () => {
    expect(i18nField(row, "tagline", "es")).toBe("Solo en español");
  });

  it("returns empty string when both locale fields are missing", () => {
    expect(i18nField(row, "rating", "es")).toBe("");
  });

  it("returns empty string for null object", () => {
    expect(i18nField(null, "name", "en")).toBe("");
  });

  it("returns empty string for undefined object", () => {
    expect(i18nField(undefined, "name", "en")).toBe("");
  });
});
