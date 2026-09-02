import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock("@/features/account", () => ({
  AccountSettingsPage: () => null,
}));

vi.mock("@/features/auth/presentation/pages/LoginPage", () => ({
  LoginPage: () => null,
}));

import AuthPage from "@/app/[locale]/page";

import { AccountSettingsPage } from "@/features/account";
import { LoginPage } from "@/features/auth/presentation/pages/LoginPage";

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders AccountSettingsPage when there is a signed-in Clerk session", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });

    const result = await AuthPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(result.type).toBe(AccountSettingsPage);
  });

  it("renders LoginPage when there is no signed-in Clerk session", async () => {
    authMock.mockResolvedValue({ userId: null });

    const result = await AuthPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(result.type).toBe(LoginPage);
  });
});
