/**
 * Tests for scripts/lib/restore-order.mjs
 *
 * These import the real module rather than copying the functions into the
 * test file, so a regression in the script actually fails the suite.
 */

import { describe, it, expect } from "vitest";

import {
  buildTruncateStatement,
  topologicalTableOrder,
} from "../lib/restore-order.mjs";

describe("topologicalTableOrder", () => {
  it("places a parent table before its child", () => {
    const order = topologicalTableOrder(
      ["order_items", "orders"],
      [["order_items", "orders"]],
    );

    expect(order.indexOf("orders")).toBeLessThan(order.indexOf("order_items"));
  });
});

// The 17 public tables a production backup contains, in the alphabetical order
// the manifest lists them (`ORDER BY table_name`) — which is the order the
// restore used to insert in, and the reason it failed.
const BACKUP_TABLES = [
  "check_in_audit",
  "check_ins",
  "events",
  "order_items",
  "orders",
  "payment_settings",
  "permissions",
  "product_entitlements",
  "product_reviews",
  "product_templates",
  "products",
  "resource_permissions",
  "seller_admins",
  "seller_payment_methods",
  "ticket_transfers",
  "user_permissions",
  "user_profiles",
];

/** `[child, parent]` foreign keys between public tables, from the migrations. */
const LIBRA_EDGES = [
  ["products", "events"],
  ["product_entitlements", "products"],
  ["order_items", "orders"],
  ["order_items", "products"],
  ["check_ins", "order_items"],
  ["check_ins", "product_entitlements"],
  ["check_in_audit", "check_ins"],
  ["ticket_transfers", "order_items"],
  ["resource_permissions", "permissions"],
  ["user_permissions", "resource_permissions"],
  ["product_reviews", "products"],
  ["seller_payment_methods", "payment_method_types"],
  ["orders", "seller_payment_methods"],
  ["seller_admins", "user_profiles"],
  ["seller_admins", "products"],
];

/** Every `[child, parent]` pair where the child is inserted first. */
function orderingViolations(order, edges) {
  const position = new Map(order.map((table, index) => [table, index]));
  return edges.filter(([child, parent]) => {
    if (!position.has(child) || !position.has(parent)) return false;
    return position.get(child) < position.get(parent);
  });
}

describe("topologicalTableOrder on the real Libra schema", () => {
  it("resolves every violation the alphabetical order had", () => {
    // Guard the premise: the old order really was broken.
    expect(orderingViolations(BACKUP_TABLES, LIBRA_EDGES)).toHaveLength(9);

    const order = topologicalTableOrder(BACKUP_TABLES, LIBRA_EDGES);

    expect(orderingViolations(order, LIBRA_EDGES)).toEqual([]);
  });

  it("keeps every table, losing and inventing none", () => {
    const order = topologicalTableOrder(BACKUP_TABLES, LIBRA_EDGES);

    expect([...order].sort()).toEqual([...BACKUP_TABLES].sort());
  });

  it("ignores foreign keys to tables outside the backup", () => {
    // seller_payment_methods -> payment_method_types, a table no longer in the
    // schema. An edge to a table we never insert cannot be satisfied by
    // ordering, and must not stall the sort.
    const order = topologicalTableOrder(BACKUP_TABLES, LIBRA_EDGES);

    expect(order).toContain("seller_payment_methods");
  });

  it("puts user_profiles before its children once the AeleOS reshape repoints the FKs", () => {
    // After the migration every user column references user_profiles(id)
    // instead of auth.users(id), making it the root parent.
    const reshaped = [
      ...LIBRA_EDGES,
      ["orders", "user_profiles"],
      ["products", "user_profiles"],
      ["user_permissions", "user_profiles"],
      ["seller_payment_methods", "user_profiles"],
    ];

    const order = topologicalTableOrder(BACKUP_TABLES, reshaped);
    const profilesAt = order.indexOf("user_profiles");

    // Being literally first is incidental — events has no parent either. What
    // must hold is that no table referencing a person is inserted before them.
    for (const child of [
      "orders",
      "products",
      "user_permissions",
      "seller_payment_methods",
      "seller_admins",
    ]) {
      expect(profilesAt).toBeLessThan(order.indexOf(child));
    }
    expect(orderingViolations(order, reshaped)).toEqual([]);
  });
});

describe("buildTruncateStatement", () => {
  it("truncates every table in one statement", () => {
    const sql = buildTruncateStatement(["orders", "order_items"]);

    expect(sql).toBe(
      'TRUNCATE "orders", "order_items" RESTART IDENTITY CASCADE',
    );
  });
});
