import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseCurrentUser = vi.fn();
vi.mock("./useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

import { ProtectedRoute } from "./ProtectedRoute";

const AUTH_URL = "http://localhost:5000";
const LOCALE = "en";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error -- jsdom's location.replace is not implemented; stub it per test
    delete globalThis.location;
    globalThis.location = {
      href: "http://localhost:3000/en/dashboard",
      replace: vi.fn(),
    } as unknown as Location;
  });

  it("shows the fallback while auth state is loading", () => {
    mockUseCurrentUser.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { container } = render(
      <ProtectedRoute
        authUrl={AUTH_URL}
        locale={LOCALE}
        fallback={<p>Loading</p>}
      >
        <p>Secret</p>
      </ProtectedRoute>,
    );

    expect(container.textContent).toBe("Loading");
    expect(globalThis.location.replace).not.toHaveBeenCalled();
  });

  it("renders children when there is a signed-in Clerk session", async () => {
    mockUseCurrentUser.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    const { findByText } = render(
      <ProtectedRoute authUrl={AUTH_URL} locale={LOCALE}>
        <p>Secret</p>
      </ProtectedRoute>,
    );

    expect(await findByText("Secret")).not.toBeNull();
    expect(globalThis.location.replace).not.toHaveBeenCalled();
  });

  it("redirects to the auth app's login page when signed out", async () => {
    mockUseCurrentUser.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <ProtectedRoute authUrl={AUTH_URL} locale={LOCALE}>
        <p>Secret</p>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(globalThis.location.replace).toHaveBeenCalledWith(
        `${AUTH_URL}/${LOCALE}/login?returnTo=${encodeURIComponent(
          globalThis.location.href,
        )}`,
      );
    });
  });

  it("renders nothing while signed out and not loading", () => {
    mockUseCurrentUser.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    const { container } = render(
      <ProtectedRoute authUrl={AUTH_URL} locale={LOCALE}>
        <p>Secret</p>
      </ProtectedRoute>,
    );

    expect(container.textContent).toBe("");
  });
});
