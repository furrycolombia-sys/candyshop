import { render } from "@testing-library/react";
// eslint-disable-next-line import/order -- vi.mock calls between imports require this ordering
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api", () => ({
  setAccessTokenGetter: vi.fn(),
  setOnUnauthorized: vi.fn(),
  setRefreshTokenCallback: vi.fn(),
}));

vi.mock("auth", () => ({
  AUTH_COOKIE_NAMES: { accessToken: "sb-access-token" },
  AUTH_REFRESH_ENDPOINT: "/auth/v1/token?grant_type=refresh_token",
  getAccessTokenFromCookie: vi.fn(() => "mock-token"),
  TOKEN_TTL_SECONDS: { access: 3600 },
}));

// eslint-disable-next-line import/order -- vi.mock must come before these imports
import {
  setAccessTokenGetter,
  setOnUnauthorized,
  setRefreshTokenCallback,
} from "api";
import { ApiAuthBootstrap } from "./ApiAuthBootstrap";

describe("ApiAuthBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null (no visible output)", () => {
    const { container } = render(
      <ApiAuthBootstrap authHostUrl="http://localhost:5000" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("registers access token getter on mount", () => {
    render(<ApiAuthBootstrap authHostUrl="http://localhost:5000" />);
    expect(setAccessTokenGetter).toHaveBeenCalledWith(expect.any(Function));
  });

  it("registers refresh token callback on mount", () => {
    render(<ApiAuthBootstrap authHostUrl="http://localhost:5000" />);
    expect(setRefreshTokenCallback).toHaveBeenCalledWith(expect.any(Function));
  });

  it("registers onUnauthorized callback on mount", () => {
    render(<ApiAuthBootstrap authHostUrl="http://localhost:5000" />);
    expect(setOnUnauthorized).toHaveBeenCalledWith(expect.any(Function));
  });

  it("cleans up callbacks on unmount", () => {
    const { unmount } = render(
      <ApiAuthBootstrap authHostUrl="http://localhost:5000" />,
    );

    vi.clearAllMocks();
    unmount();

    expect(setAccessTokenGetter).toHaveBeenCalledWith(null);
    expect(setRefreshTokenCallback).toHaveBeenCalledWith(null);
    expect(setOnUnauthorized).toHaveBeenCalledWith(null);
  });
});
