// @vitest-environment jsdom

import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readNavPermCache,
  writeNavPermCache,
  clearNavPermCache,
} from "./navPermCachePersistence";

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

describe("readNavPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when cookie is absent", () => {
    mockGetCookie.mockReturnValue(undefined as unknown as string);
    expect(readNavPermCache()).toBeNull();
  });

  it("returns string[] when cookie holds valid JSON array", () => {
    mockGetCookie.mockReturnValue(
      JSON.stringify(["products.create", "orders.read"]),
    );
    expect(readNavPermCache()).toEqual(["products.create", "orders.read"]);
  });

  it("returns empty array when cookie holds []", () => {
    mockGetCookie.mockReturnValue("[]");
    expect(readNavPermCache()).toEqual([]);
  });

  it("returns null when cookie holds invalid JSON", () => {
    mockGetCookie.mockReturnValue("not-json{{{");
    expect(readNavPermCache()).toBeNull();
  });

  it("returns null when cookie holds a non-array JSON value", () => {
    mockGetCookie.mockReturnValue(JSON.stringify({ key: "value" }));
    expect(readNavPermCache()).toBeNull();
  });

  it("returns null when cookie holds an array with non-string items", () => {
    mockGetCookie.mockReturnValue(JSON.stringify([1, 2, 3]));
    expect(readNavPermCache()).toBeNull();
  });
});

describe("writeNavPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls setCookie with the key, JSON-stringified keys, and maxAge 3600", () => {
    setHostname("localhost");
    const keys = ["products.create", "orders.read"];
    writeNavPermCache(keys);

    expect(mockSetCookie).toHaveBeenCalledWith(
      "candystore-nav-perm",
      JSON.stringify(keys),
      expect.objectContaining({ maxAge: 3600 }),
    );
  });

  it("does NOT pre-delete when domain is undefined (localhost dev)", () => {
    setHostname("localhost");
    writeNavPermCache(["products.create"]);

    expect(mockDeleteCookie).not.toHaveBeenCalled();
  });

  it("pre-deletes the no-domain cookie before setting when domain is present", () => {
    setHostname("store.example.com");
    writeNavPermCache(["products.create"]);

    expect(mockDeleteCookie).toHaveBeenCalledWith("candystore-nav-perm", {
      path: "/",
    });
    expect(mockSetCookie).toHaveBeenCalledWith(
      "candystore-nav-perm",
      expect.any(String),
      expect.objectContaining({ domain: ".example.com" }),
    );
  });
});

describe("clearNavPermCache", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteCookie once with base options when domain is undefined", () => {
    setHostname("localhost");
    clearNavPermCache();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(1);
    expect(mockDeleteCookie).toHaveBeenCalledWith(
      "candystore-nav-perm",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("calls deleteCookie twice when domain is present (double-delete pattern)", () => {
    setHostname("store.example.com");
    clearNavPermCache();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(2);
    expect(mockDeleteCookie).toHaveBeenNthCalledWith(
      1,
      "candystore-nav-perm",
      expect.objectContaining({ domain: ".example.com" }),
    );
    expect(mockDeleteCookie).toHaveBeenNthCalledWith(2, "candystore-nav-perm", {
      path: "/",
    });
  });
});
