import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateWithRedirect = vi.fn();

type MockUseSignInReturn =
  | { isLoaded: false; signIn: undefined }
  | {
      isLoaded: true;
      signIn: { authenticateWithRedirect: typeof authenticateWithRedirect };
    };

const useSignInMock = vi.fn(
  (): MockUseSignInReturn => ({
    isLoaded: true,
    signIn: { authenticateWithRedirect },
  }),
);

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("@clerk/nextjs/legacy", () => ({
  useSignIn: () => useSignInMock(),
}));

import { SocialLoginButtons } from "./SocialLoginButtons";

describe("SocialLoginButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the available provider buttons", () => {
    render(<SocialLoginButtons />);
    expect(screen.getByTestId("login-google")).toBeInTheDocument();
    expect(screen.getByTestId("login-discord")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("starts a Google sign-in through Clerk", async () => {
    const user = userEvent.setup();
    render(<SocialLoginButtons />);

    await user.click(screen.getByTestId("login-google"));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "oauth_google" }),
    );
  });

  it("starts a Discord sign-in through Clerk", async () => {
    const user = userEvent.setup();
    render(<SocialLoginButtons />);

    await user.click(screen.getByTestId("login-discord"));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "oauth_discord" }),
    );
  });

  it("points the OAuth flow at the sso-callback page and the final callback route", async () => {
    const user = userEvent.setup();
    render(<SocialLoginButtons />);

    await user.click(screen.getByTestId("login-google"));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: "/en/sso-callback",
        redirectUrlComplete: `/en/callback?next=${encodeURIComponent("/en/profile")}`,
      }),
    );
  });

  it("does nothing when Clerk has not finished loading yet", async () => {
    useSignInMock.mockReturnValueOnce({
      isLoaded: false,
      signIn: undefined,
    });

    const user = userEvent.setup();
    render(<SocialLoginButtons />);
    await user.click(screen.getByTestId("login-google"));

    expect(authenticateWithRedirect).not.toHaveBeenCalled();
  });
});
