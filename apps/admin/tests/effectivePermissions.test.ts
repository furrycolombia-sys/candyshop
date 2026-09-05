import { describe, expect, it } from "vitest";

import {
  getEffectivePermissionKeys,
  type PermissionModeRow,
} from "@/app/api/admin/_shared/adminRest";

const row = (
  key: string,
  mode: "grant" | "deny",
  expires_at: string | null = null,
  resourcePermissionId = `${key}:${mode}`,
): PermissionModeRow => ({
  expires_at,
  mode,
  resource_permission_id: resourcePermissionId,
  resource_permissions: { permissions: { key } },
});

const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + HOUR).toISOString();
const past = () => new Date(Date.now() - HOUR).toISOString();

describe("getEffectivePermissionKeys", () => {
  it("returns granted keys", () => {
    expect(
      getEffectivePermissionKeys([row("orders.approve", "grant")]),
    ).toEqual(["orders.approve"]);
  });

  it("drops an expired grant", () => {
    expect(
      getEffectivePermissionKeys([row("orders.approve", "grant", past())]),
    ).toEqual([]);
  });

  it("keeps a grant that has not expired yet", () => {
    expect(
      getEffectivePermissionKeys([row("orders.approve", "grant", future())]),
    ).toEqual(["orders.approve"]);
  });

  // The rule public.has_permission() enforces, which every RLS policy calls:
  //   exists(grant, unexpired) AND NOT exists(deny, unexpired)
  // resource_permissions is unique on (permission_id, resource_type,
  // resource_id), so one key can be granted on one scope and denied on
  // another. The API layer used to ask only for mode=eq.grant and would have
  // admitted this user while RLS refused them.
  it("a deny on one scope revokes a key granted on another", () => {
    const rows = [
      row("orders.approve", "grant", null, "rp-global"),
      row("orders.approve", "deny", null, "rp-seller-42"),
    ];
    expect(getEffectivePermissionKeys(rows)).toEqual([]);
  });

  it("an expired deny does not revoke anything", () => {
    const rows = [
      row("orders.approve", "grant", null, "rp-global"),
      row("orders.approve", "deny", past(), "rp-seller-42"),
    ];
    expect(getEffectivePermissionKeys(rows)).toEqual(["orders.approve"]);
  });

  it("a deny on one key leaves other keys alone", () => {
    const rows = [
      row("orders.approve", "grant"),
      row("orders.request_proof", "grant"),
      row("orders.approve", "deny", null, "rp-other"),
    ];
    expect(getEffectivePermissionKeys(rows)).toEqual(["orders.request_proof"]);
  });

  it("deduplicates a key granted on several scopes", () => {
    const rows = [
      row("orders.approve", "grant", null, "rp-a"),
      row("orders.approve", "grant", null, "rp-b"),
    ];
    expect(getEffectivePermissionKeys(rows)).toEqual(["orders.approve"]);
  });

  it("returns nothing for a user with no rows", () => {
    expect(getEffectivePermissionKeys([])).toEqual([]);
  });
});
