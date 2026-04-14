import { describe, it, expect } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("merges multiple class strings", () => {
    const result = cn("px-4", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("handles conditional classes via objects", () => {
    const result = cn("base", { active: true, disabled: false });
    expect(result).toBe("base active");
  });

  it("handles undefined and null values", () => {
    const result = cn("base", undefined, null, "extra");
    expect(result).toBe("base extra");
  });

  it("handles empty strings", () => {
    const result = cn("base", "", "extra");
    expect(result).toBe("base extra");
  });

  it("handles arrays of classes", () => {
    const result = cn(["px-4", "py-2"]);
    expect(result).toBe("px-4 py-2");
  });

  it("deduplicates conflicting Tailwind classes via tailwind-merge", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("deduplicates conflicting color classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("preserves custom text-ui-xs alongside text-color classes", () => {
    // This tests the extendTailwindMerge custom font-size config
    const result = cn("text-ui-xs", "text-success");
    expect(result).toBe("text-ui-xs text-success");
  });

  it("resolves conflicting font-size utilities correctly", () => {
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  it("returns empty string for no inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles boolean false values in arrays", () => {
    const isActive = false;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base");
  });
});
