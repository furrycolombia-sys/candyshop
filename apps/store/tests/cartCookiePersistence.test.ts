import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSetCookie = vi.hoisted(() => vi.fn());
const mockDeleteCookie = vi.hoisted(() => vi.fn());

vi.mock("cookies-next", () => ({
  setCookie: mockSetCookie,
  deleteCookie: mockDeleteCookie,
}));

const mockGetSharedCookieDomain = vi.hoisted(() => vi.fn());

vi.mock("shared", () => ({
  getSharedCookieDomain: mockGetSharedCookieDomain,
}));

vi.mock("shared/constants/cart", () => ({
  CART_COOKIE_KEY: "libra-cart",
}));

vi.mock("shared/constants/time", () => ({
  HOURS_PER_DAY: 24,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_MINUTE: 60,
}));

vi.mock("shared/types", () => ({}));

import {
  getCartCookieOptions,
  persistCartCookie,
  removeCartCookie,
  COOKIE_MAX_AGE_S,
} from "@/shared/application/cart/cartCookiePersistence";

describe("COOKIE_MAX_AGE_S", () => {
  it("equals 30 days in seconds", () => {
    expect(COOKIE_MAX_AGE_S).toBe(30 * 24 * 60 * 60);
  });
});

describe("getCartCookieOptions — server-side (no window)", () => {
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // @ts-expect-error -- simulate SSR: no window
    delete globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("returns secure: false and no domain when window is undefined", () => {
    const options = getCartCookieOptions();
    expect(options.secure).toBe(false);
    expect(options.domain).toBeUndefined();
    expect(options.path).toBe("/");
    expect(options.sameSite).toBe("lax");
  });
});

describe("getCartCookieOptions — browser (with window)", () => {
  beforeEach(() => {
    mockGetSharedCookieDomain.mockReset();
  });

  it("returns secure: true on https and includes domain when resolveSharedCookieDomain returns one", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:", hostname: "store.example.com" },
      writable: true,
      configurable: true,
    });
    mockGetSharedCookieDomain.mockReturnValue(".example.com");

    const options = getCartCookieOptions();
    expect(options.secure).toBe(true);
    expect(options.domain).toBe(".example.com");
  });

  it("returns secure: false on http", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "http:", hostname: "localhost" },
      writable: true,
      configurable: true,
    });
    mockGetSharedCookieDomain.mockReturnValue(void 0);

    const options = getCartCookieOptions();
    expect(options.secure).toBe(false);
    expect(options.domain).toBeUndefined();
  });

  it("omits domain when getSharedCookieDomain returns undefined", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:", hostname: "localhost" },
      writable: true,
      configurable: true,
    });
    mockGetSharedCookieDomain.mockReturnValue(void 0);

    const options = getCartCookieOptions();
    expect(options.domain).toBeUndefined();
  });
});

describe("persistCartCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSharedCookieDomain.mockReturnValue(void 0);
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "http:", hostname: "localhost" },
      writable: true,
      configurable: true,
    });
  });

  it("calls setCookie with serialized cart items", () => {
    const items = [
      { id: "p1", quantity: 2, seller_id: "s1" },
      { id: "p2", quantity: 1, seller_id: "s2" },
    ] as unknown as Parameters<typeof persistCartCookie>[0];

    persistCartCookie(items);

    expect(mockSetCookie).toHaveBeenCalledOnce();
    const [key, value] = mockSetCookie.mock.calls[0]! as [
      string,
      string,
      unknown,
    ];
    expect(key).toBe("libra-cart");
    const parsed = JSON.parse(value) as { id: string; quantity: number }[];
    expect(parsed).toEqual([
      { id: "p1", quantity: 2 },
      { id: "p2", quantity: 1 },
    ]);
  });

  it("calls deleteCookie first when domain is set (to clear root-path cookie)", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:", hostname: "store.example.com" },
      writable: true,
      configurable: true,
    });
    mockGetSharedCookieDomain.mockReturnValue(".example.com");

    persistCartCookie([]);

    expect(mockDeleteCookie).toHaveBeenCalledWith("libra-cart", {
      path: "/",
    });
    expect(mockSetCookie).toHaveBeenCalledOnce();
  });

  it("does not call deleteCookie when domain is not set", () => {
    persistCartCookie([]);
    expect(mockDeleteCookie).not.toHaveBeenCalled();
  });

  it("includes maxAge in setCookie options", () => {
    persistCartCookie([]);
    const options = mockSetCookie.mock.calls[0]![2] as Record<string, unknown>;
    expect(options.maxAge).toBe(COOKIE_MAX_AGE_S);
  });
});

describe("removeCartCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSharedCookieDomain.mockReturnValue(void 0);
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "http:", hostname: "localhost" },
      writable: true,
      configurable: true,
    });
  });

  it("calls deleteCookie with cookie options", () => {
    removeCartCookie();
    expect(mockDeleteCookie).toHaveBeenCalledOnce();
  });

  it("calls deleteCookie twice when domain is set (once with domain, once root path)", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:", hostname: "store.example.com" },
      writable: true,
      configurable: true,
    });
    mockGetSharedCookieDomain.mockReturnValue(".example.com");

    removeCartCookie();

    expect(mockDeleteCookie).toHaveBeenCalledTimes(2);
    const calls = mockDeleteCookie.mock.calls as [string, unknown][];
    expect(calls[0]![0]).toBe("libra-cart");
    expect(calls[1]).toEqual(["libra-cart", { path: "/" }]);
  });

  it("calls deleteCookie only once when no domain", () => {
    removeCartCookie();
    expect(mockDeleteCookie).toHaveBeenCalledTimes(1);
  });
});
