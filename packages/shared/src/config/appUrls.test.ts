import { afterEach, describe, expect, it, vi } from "vitest";

const EXPECTED_DEV_URLS = {
  landing: "http://localhost:5004",
  store: "http://localhost:5001",
  studio: "http://localhost:5006",
  payments: "http://localhost:5005",
  admin: "http://localhost:5002",
  auth: "http://localhost:5000",
  playground: "http://localhost:5003",
} as const;

const EXPECTED_PROD_PATHS = {
  landing: "/",
  store: "/store",
  studio: "/studio",
  payments: "/payments",
  admin: "/admin",
  auth: "/auth",
  playground: "/playground",
} as const;

async function importFreshAppUrls() {
  vi.resetModules();
  return import("./appUrls");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("appUrls", () => {
  it("uses local app URLs by default in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { appUrls } = await importFreshAppUrls();
    expect(appUrls).toEqual(EXPECTED_DEV_URLS);
  });

  it("uses relative same-domain paths by default in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { appUrls } = await importFreshAppUrls();
    expect(appUrls).toEqual(EXPECTED_PROD_PATHS);
  });

  it("derives public absolute URLs from SITE_PUBLIC_ORIGIN for production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_PUBLIC_ORIGIN", "https://shop.example.com/");

    const { appUrls } = await importFreshAppUrls();
    expect(appUrls).toEqual({
      landing: "https://shop.example.com",
      store: "https://shop.example.com/store",
      studio: "https://shop.example.com/studio",
      payments: "https://shop.example.com/payments",
      admin: "https://shop.example.com/admin",
      auth: "https://shop.example.com/auth",
      playground: "https://shop.example.com/playground",
    });
  });

  it("lets explicit NEXT_PUBLIC app URLs override the defaults", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_STORE_URL", "https://store.example.com");
    vi.stubEnv("NEXT_PUBLIC_AUTH_URL", "/auth");

    const { appUrls } = await importFreshAppUrls();
    expect(appUrls.store).toBe("https://store.example.com");
    expect(appUrls.auth).toBe("/auth");
    expect(appUrls.admin).toBe("/admin");
  });

  it("prefers SITE_PUBLIC_ORIGIN over explicit app URLs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_PUBLIC_ORIGIN", "https://shop.example.com/");
    vi.stubEnv("NEXT_PUBLIC_STORE_URL", "http://localhost:5001");
    vi.stubEnv("NEXT_PUBLIC_AUTH_URL", "http://localhost:5000");

    const { appUrls } = await importFreshAppUrls();
    expect(appUrls.store).toBe("https://shop.example.com/store");
    expect(appUrls.auth).toBe("https://shop.example.com/auth");
  });
});
