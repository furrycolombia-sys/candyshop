import { describe, it, expect, vi, afterEach } from "vitest";

import { tid, TID_ATTR } from "./tid";

describe("tid", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("in non-production mode", () => {
    it("returns data-testid when passed a string", () => {
      const result = tid("my-test-id");

      expect(result).toStrictEqual({ [TID_ATTR]: "my-test-id" });
    });

    it("returns data-testid when passed options with id", () => {
      const result = tid({ id: "my-test-id" });

      expect(result).toStrictEqual({ [TID_ATTR]: "my-test-id" });
    });

    it("returns data-test-class when passed options with cls string", () => {
      const result = tid({ cls: "my-class" });

      expect(result).toStrictEqual({ "data-test-class": "my-class" });
    });

    it("returns data-test-class when passed options with cls array", () => {
      const result = tid({ cls: ["class1", "class2"] });

      expect(result).toStrictEqual({ "data-test-class": "class1 class2" });
    });

    it("returns data-test-* attributes when passed options with vals", () => {
      const result = tid({ vals: { state: "active", count: "5" } });

      expect(result).toStrictEqual({
        "data-test-state": "active",
        "data-test-count": "5",
      });
    });

    it("combines id, cls, and vals together", () => {
      const result = tid({
        id: "my-id",
        cls: ["class1", "class2"],
        vals: { state: "active" },
      });

      expect(result).toStrictEqual({
        [TID_ATTR]: "my-id",
        "data-test-class": "class1 class2",
        "data-test-state": "active",
      });
    });

    it("returns empty object when options are empty", () => {
      const result = tid({});

      expect(result).toStrictEqual({});
    });
  });

  describe("in production mode", () => {
    it("returns empty object", () => {
      vi.stubEnv("NODE_ENV", "production");

      const result = tid("my-test-id");

      expect(result).toStrictEqual({});
    });

    it("returns test IDs when NEXT_PUBLIC_ENABLE_TEST_IDS is set", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_IDS", "true");

      const result = tid("my-test-id");

      expect(result).toStrictEqual({ [TID_ATTR]: "my-test-id" });
    });
  });
});
