import { describe, expect, it } from "vitest";

import { getUpdatedPermissionKeysForTemplateToggle } from "./templatePermissions";

describe("getUpdatedPermissionKeysForTemplateToggle", () => {
  it("adds missing keys when activating a template", () => {
    expect(
      getUpdatedPermissionKeysForTemplateToggle(
        ["products.read"],
        "seller",
        true,
      ),
    ).toContain("seller_payment_methods.read");
  });

  it("preserves overlapping keys required by another active template", () => {
    const grantedKeys = getUpdatedPermissionKeysForTemplateToggle(
      [],
      "admin",
      true,
    );

    expect(
      getUpdatedPermissionKeysForTemplateToggle(grantedKeys, "seller", false),
    ).toContain("seller_payment_methods.read");
  });

  it("removes template-only keys when deactivating a template", () => {
    const grantedKeys = getUpdatedPermissionKeysForTemplateToggle(
      [],
      "events",
      true,
    );

    expect(
      getUpdatedPermissionKeysForTemplateToggle(grantedKeys, "events", false),
    ).not.toContain("events.read");
  });
});
