// @vitest-environment jsdom

import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readPermCache,
  writePermCache,
  clearPermCache,
} from "./permCachePersistence";

vi.mock("cookies-next", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

const mockGetCookie = vi.mocked(getCookie);
const mockSetCookie = vi.mocked(setCookie);
const mockDeleteCookie = vi.mocked(deleteCookie);

function setHostname(hostname: string, protocol = "http:") {
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { hostname, protocol },
  });
}

describe("readPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when cookie is absent", () => {
    mockGetCookie.mockReturnValue(undefined as unknown as string);
    expect(readPermCache()).toBeNull();
  });

  it("returns string[] when cookie holds valid JSON array", () => {
    mockGetCookie.mockReturnValue(
      JSON.stringify(["products.create", "orders.read"]),
    );
    expect(readPermCache()).toEqual(["products.create", "orders.read"]);
  });

  it("returns empty array when cookie holds []", () => {
    mockGetCookie.mockReturnValue("[]");
    expect(readPermCache()).toEqual([]);
  });

  it("returns null when cookie holds invalid JSON", () => {
    mockGetCookie.mockReturnValue("not-json{{{");
    expect(readPermCache()).toBeNull();
  });

  it("returns null when cookie holds a non-array JSON value", () => {
    mockGetCookie.mockReturnValue(JSON.stringify({ key: "value" }));
    expect(readPermCache()).toBeNull();
  });

  it("returns null when cookie holds an array with non-string items", () => {
    mockGetCookie.mockReturnValue(JSON.stringify([1, 2, 3]));
    expect(readPermCache()).toBeNull();
  });
});

describe("writePermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls setCookie with the key, JSON-stringified keys, and maxAge 3600", () => {
    setHostname("localhost");
    const keys = ["products.create", "orders.read"];
    writePermCache(keys);

    expect(mockSetCookie).toHaveBeenCalledWith(
      "libra-perm",
      JSON.stringify(keys),
      expect.objectContaining({ maxAge: 3600 }),
    );
  });

  it("does NOT pre-delete when domain is undefined (localhost dev)", () => {
    setHostname("localhost");
    writePermCache(["products.create"]);

    expect(mockDeleteCookie).not.toHaveBeenCalled();
  });

  it("pre-deletes the no-domain cookie before setting when domain is present", () => {
    setHostname("store.example.com");
    writePermCache(["products.create"]);

    expect(mockDeleteCookie).toHaveBeenCalledWith("libra-perm", {
      path: "/",
    });
    expect(mockSetCookie).toHaveBeenCalledWith(
      "libra-perm",
      expect.any(String),
      expect.objectContaining({ domain: ".example.com" }),
    );
  });

  it("does NOT call setCookie when serialised payload exceeds 3500 bytes", () => {
    setHostname("localhost");
    // 500 keys of ~18 chars each → ~9 KB serialised, well above the 3500-byte guard
    const bigKeys = Array.from(
      { length: 500 },
      (_, i) => `products.perm${String(i).padStart(3, "0")}`,
    );
    writePermCache(bigKeys);

    expect(mockSetCookie).not.toHaveBeenCalled();
  });
});

describe("clearPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteCookie once with base options when domain is undefined", () => {
    setHostname("localhost");
    clearPermCache();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(1);
    expect(mockDeleteCookie).toHaveBeenCalledWith(
      "libra-perm",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("calls deleteCookie twice when domain is present (double-delete pattern)", () => {
    setHostname("store.example.com");
    clearPermCache();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(2);
    expect(mockDeleteCookie).toHaveBeenNthCalledWith(
      1,
      "libra-perm",
      expect.objectContaining({ domain: ".example.com" }),
    );
    expect(mockDeleteCookie).toHaveBeenNthCalledWith(2, "libra-perm", {
      path: "/",
    });
  });
});
