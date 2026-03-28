import { describe, it, expect } from "vitest";

import en from "./messages/en.json";
import es from "./messages/es.json";

/** Recursively collect all leaf keys from a nested object */
function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("i18n messages consistency", () => {
  const enKeys = collectKeys(en).sort();
  const esKeys = collectKeys(es).sort();

  it("en.json has keys", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it("es.json has keys", () => {
    expect(esKeys.length).toBeGreaterThan(0);
  });

  it("en.json and es.json have the same keys", () => {
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));

    expect(missingInEs).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it("no en.json values are empty strings", () => {
    const emptyKeys = enKeys.filter((key) => {
      const parts = key.split(".");
      let current: unknown = en;
      for (const part of parts) {
        current = (current as Record<string, unknown>)[part];
      }
      return current === "";
    });
    expect(emptyKeys).toEqual([]);
  });

  it("no es.json values are empty strings", () => {
    const emptyKeys = esKeys.filter((key) => {
      const parts = key.split(".");
      let current: unknown = es;
      for (const part of parts) {
        current = (current as Record<string, unknown>)[part];
      }
      return current === "";
    });
    expect(emptyKeys).toEqual([]);
  });
});
