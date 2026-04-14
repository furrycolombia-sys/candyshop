import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignIn = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("@/features/auth/application/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    signInWithProvider: mockSignIn,
  }),
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

  it("calls signInWithProvider when button is clicked", () => {
    render(<SocialLoginButtons />);
    fireEvent.click(screen.getByTestId("login-google"));
    expect(mockSignIn).toHaveBeenCalledWith("google", expect.any(String));
  });
});
