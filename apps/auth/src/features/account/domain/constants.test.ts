import { describe, it, expect } from "vitest";

import { PROFILE_QUERY_KEY } from "./constants";

describe("account domain constants", () => {
  it("defines PROFILE_QUERY_KEY", () => {
    expect(PROFILE_QUERY_KEY).toBe("user-profile");
  });
});
