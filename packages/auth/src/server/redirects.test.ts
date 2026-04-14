import { describe, expect, it } from "vitest";

import { buildLoginRedirectUrl, resolveSafeRedirectTarget } from "./redirects";

describe("buildLoginRedirectUrl", () => {
  it("builds URL with absolute authHostUrl", () => {
    const url = buildLoginRedirectUrl({
      authHostUrl: "https://auth.example.com",
      requestOrigin: "https://app.example.com",
      locale: "en",
      returnTo: "/dashboard",
    });

    expect(url).toBe("https://auth.example.com/en/login?returnTo=%2Fdashboard");
  });

  it("builds URL with relative authHostUrl", () => {
    const url = buildLoginRedirectUrl({
      authHostUrl: "/auth",
      requestOrigin: "https://app.example.com",
      locale: "es",
      returnTo: "/settings",
    });

    expect(url).toBe(
      "https://app.example.com/auth/es/login?returnTo=%2Fsettings",
    );
  });

  it("strips trailing slash from authHostUrl", () => {
    const url = buildLoginRedirectUrl({
      authHostUrl: "https://auth.example.com/",
      requestOrigin: "https://app.example.com",
      locale: "en",
      returnTo: "/home",
    });

    expect(url).toBe("https://auth.example.com/en/login?returnTo=%2Fhome");
  });

  it("encodes returnTo parameter", () => {
    const url = buildLoginRedirectUrl({
      authHostUrl: "https://auth.example.com",
      requestOrigin: "https://app.example.com",
      locale: "en",
      returnTo: "/page?foo=bar&baz=1",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("returnTo")).toBe("/page?foo=bar&baz=1");
  });
});

describe("resolveSafeRedirectTarget", () => {
  const defaultInput = {
    fallback: "/default",
    requestOrigin: "https://app.example.com",
    allowedOrigins: ["https://app.example.com", "https://admin.example.com"],
  };

  it("returns fallback when value is null", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      value: null,
    });

    expect(result).toBe("/default");
  });

  it("returns fallback when value is empty string", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      value: "",
    });

    expect(result).toBe("/default");
  });

  it("returns URL when origin is in allowed list", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      value: "https://app.example.com/dashboard",
    });

    expect(result).toBe("https://app.example.com/dashboard");
  });

  it("resolves relative URL against requestOrigin and allows it", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      value: "/dashboard",
    });

    expect(result).toBe("https://app.example.com/dashboard");
  });

  it("returns fallback when origin is not in allowed list", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      value: "https://evil.example.com/phishing",
    });

    expect(result).toBe("/default");
  });

  it("returns fallback for invalid URL that cannot be parsed", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      // Providing both an invalid absolute URL and empty requestOrigin triggers catch
      value: "://totally-broken",
      requestOrigin: "",
      allowedOrigins: [],
    });

    expect(result).toBe("/default");
  });

  it("allows second allowed origin", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      value: "https://admin.example.com/settings",
    });

    expect(result).toBe("https://admin.example.com/settings");
  });

  it("handles allowed origins with invalid entries gracefully", () => {
    const result = resolveSafeRedirectTarget({
      ...defaultInput,
      allowedOrigins: ["not-a-valid-url", "https://app.example.com"],
      value: "https://app.example.com/page",
    });

    expect(result).toBe("https://app.example.com/page");
  });
});
