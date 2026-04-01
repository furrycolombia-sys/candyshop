// eslint-disable-next-line import/order -- vi.mock calls between imports require this ordering
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("cookies-next", () => ({
  getCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { getCookie, deleteCookie } from "cookies-next";

import {
  clearCartCookie,
  readCartFromCookie,
  subscribeToCartCookie,
} from "./cartCookie";

const mockGetCookie = getCookie as unknown as ReturnType<typeof vi.fn>;
const mockDeleteCookie = deleteCookie as unknown as ReturnType<typeof vi.fn>;

describe("readCartFromCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when cookie is not set", () => {
    mockGetCookie.mockReturnValue(null);
    expect(readCartFromCookie()).toEqual([]);
  });

  it("returns empty array when cookie is empty string", () => {
    mockGetCookie.mockReturnValue("");
    expect(readCartFromCookie()).toEqual([]);
  });

  it("returns empty array when cookie contains invalid JSON", () => {
    mockGetCookie.mockReturnValue("not-json");
    expect(readCartFromCookie()).toEqual([]);
  });

  it("returns empty array when cookie contains a non-array JSON", () => {
    mockGetCookie.mockReturnValue(JSON.stringify({ id: "1" }));
    expect(readCartFromCookie()).toEqual([]);
  });

  it("filters out invalid cart items", () => {
    const items = [
      {
        id: "p1",
        name_en: "Widget",
        name_es: "Widget",
        price_cop: 1000,
        price_usd: 1,
        seller_id: "s1",
        quantity: 2,
        images: [],
        max_quantity: 10,
      },
      { invalid: true }, // missing required fields
      null,
    ];
    mockGetCookie.mockReturnValue(JSON.stringify(items));
    const result = readCartFromCookie();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("returns valid cart items from cookie", () => {
    const items = [
      {
        id: "p1",
        name_en: "Widget",
        name_es: "Widget",
        price_cop: 5000,
        price_usd: 1.5,
        seller_id: "s1",
        quantity: 3,
        images: [],
        max_quantity: null,
      },
    ];
    mockGetCookie.mockReturnValue(JSON.stringify(items));
    const result = readCartFromCookie();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "p1",
      price_cop: 5000,
      quantity: 3,
    });
  });
});

describe("clearCartCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the cart cookie with path /", () => {
    clearCartCookie();
    expect(mockDeleteCookie).toHaveBeenCalledWith("candystore-cart", {
      path: "/",
    });
  });

  it("notifies listeners after clearing the cart cookie", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToCartCookie(listener);

    clearCartCookie();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
