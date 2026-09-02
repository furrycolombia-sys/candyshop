import { describe, it, expect } from "vitest";

import {
  assignBlockId,
  assignFieldId,
  removeById,
  reorderById,
  validatePaymentMethodName,
  validateDisplayBlock,
  validateFormField,
} from "./utils";

describe("assignBlockId", () => {
  it("preserves an existing id", () => {
    const block = {
      id: "existing-id",
      type: "text" as const,
      content_en: "hi",
    };
    expect(assignBlockId(block).id).toBe("existing-id");
  });

  it("assigns a uuid when id is absent", () => {
    const block = { type: "text" as const, content_en: "hi" };
    const result = assignBlockId(block);
    expect(result.id).toBeTruthy();
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("assigns a uuid when id is empty string", () => {
    const block = { id: "", type: "text" as const, content_en: "hi" };
    const result = assignBlockId(block);
    expect(result.id).toBeTruthy();
  });

  it("returns a new object (immutable)", () => {
    const block = { type: "text" as const, content_en: "hi" };
    const result = assignBlockId(block);
    expect(result).not.toBe(block);
  });
});

describe("assignFieldId", () => {
  it("preserves an existing id", () => {
    const field = {
      id: "field-1",
      type: "text" as const,
      label_en: "Name",
      required: false,
    };
    expect(assignFieldId(field).id).toBe("field-1");
  });

  it("assigns a uuid when id is absent", () => {
    const field = { type: "text" as const, label_en: "Name", required: false };
    const result = assignFieldId(field);
    expect(result.id).toBeTruthy();
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("removeById", () => {
  const items = [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Carol" },
  ];

  it("removes the item with the given id", () => {
    const result = removeById(items, "b");
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("returns a new array (immutable)", () => {
    const result = removeById(items, "a");
    expect(result).not.toBe(items);
  });

  it("returns all items when id is not found", () => {
    const result = removeById(items, "z");
    expect(result).toHaveLength(3);
  });

  it("returns empty array when the only item is removed", () => {
    expect(removeById([{ id: "x" }], "x")).toEqual([]);
  });
});

describe("reorderById", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("reorders to the specified id order", () => {
    const result = reorderById(items, ["c", "a", "b"]);
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("appends items not mentioned in newOrder", () => {
    const result = reorderById(items, ["b"]);
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("returns a new array (immutable)", () => {
    expect(reorderById(items, ["a", "b", "c"])).not.toBe(items);
  });

  it("handles empty newOrder by returning all items in original order", () => {
    const result = reorderById(items, []);
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("skips ids in newOrder that do not exist in the array", () => {
    const result = reorderById(items, ["z", "b", "a"]);
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
});

describe("validatePaymentMethodName", () => {
  it("returns null for a valid name", () => {
    expect(validatePaymentMethodName("Bank Transfer")).toBeNull();
  });

  it("returns error for empty string", () => {
    expect(validatePaymentMethodName("")).not.toBeNull();
  });

  it("returns error for whitespace-only string", () => {
    expect(validatePaymentMethodName("   ")).not.toBeNull();
  });
});

describe("validateDisplayBlock", () => {
  it("returns null for a valid text block", () => {
    expect(
      validateDisplayBlock({ type: "text", content_en: "Hello" }),
    ).toBeNull();
  });

  it("returns null for a valid image block with url", () => {
    expect(
      validateDisplayBlock({
        type: "image",
        url: "https://example.com/img.png",
      }),
    ).toBeNull();
  });

  it("returns null for a valid video block with url", () => {
    expect(
      validateDisplayBlock({
        type: "video",
        url: "https://www.youtube.com/embed/abc",
      }),
    ).toBeNull();
  });

  it("returns null for a valid link block with url", () => {
    expect(
      validateDisplayBlock({
        type: "link",
        url: "https://example.com",
        label_en: "Visit",
      }),
    ).toBeNull();
  });

  it("returns null for a valid url block with url", () => {
    expect(
      validateDisplayBlock({
        type: "url",
        url: "https://example.com",
      }),
    ).toBeNull();
  });

  it("returns error for unknown block type", () => {
    expect(validateDisplayBlock({ type: "unknown" as never })).not.toBeNull();
  });

  it("returns error for missing type", () => {
    expect(validateDisplayBlock({})).not.toBeNull();
  });

  it("returns error for image block without url", () => {
    expect(validateDisplayBlock({ type: "image" })).not.toBeNull();
  });

  it("returns error for video block with empty url", () => {
    expect(validateDisplayBlock({ type: "video", url: "  " })).not.toBeNull();
  });

  it("returns error for link block without url", () => {
    expect(validateDisplayBlock({ type: "link" })).not.toBeNull();
  });

  it("returns error for url block without url", () => {
    expect(validateDisplayBlock({ type: "url" })).not.toBeNull();
  });
});

describe("validateFormField", () => {
  it("returns null for a valid text field", () => {
    expect(validateFormField({ type: "text", label_en: "Name" })).toBeNull();
  });

  it("returns null for email, number, textarea types", () => {
    expect(validateFormField({ type: "email", label_en: "Email" })).toBeNull();
    expect(
      validateFormField({ type: "number", label_en: "Amount" }),
    ).toBeNull();
    expect(
      validateFormField({ type: "textarea", label_en: "Notes" }),
    ).toBeNull();
  });

  it("returns error for unknown field type", () => {
    expect(
      validateFormField({ type: "checkbox" as never, label_en: "Accept" }),
    ).not.toBeNull();
  });

  it("returns error for missing type", () => {
    expect(validateFormField({ label_en: "Name" })).not.toBeNull();
  });

  it("returns error for missing label", () => {
    expect(validateFormField({ type: "text" })).not.toBeNull();
  });

  it("returns error for empty label", () => {
    expect(validateFormField({ type: "text", label_en: "   " })).not.toBeNull();
  });
});
