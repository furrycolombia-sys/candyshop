import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("../components/SocialLoginButtons", () => ({
  SocialLoginButtons: () => <div data-testid="social-buttons">Buttons</div>,
}));

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders login card", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-card")).toBeInTheDocument();
  });

  it("renders social login buttons", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("social-buttons")).toBeInTheDocument();
  });
});
