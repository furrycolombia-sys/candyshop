import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
  useLocale: () => "en",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/dashboard",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("cookies-next", () => ({
  setCookie: vi.fn(),
}));

vi.mock("shared", () => ({
  useThemeContext: () => ({
    effectiveTheme: "light",
    toggleTheme: vi.fn(),
    mounted: true,
  }),
  tid: (id: string) => ({ "data-testid": id }),
  TID_ATTR: "data-testid",
}));

import { AppNavigation, type AppId } from "./AppNavigation";

const defaultUrls: Record<AppId, string> = {
  store: "/store",
  studio: "/studio",
  landing: "/landing",
  payments: "/payments",
  admin: "/admin",
  auth: "/auth",
  playground: "/playground",
};

const defaultLocales = ["en", "es"] as const;

describe("AppNavigation", () => {
  it("renders without crashing", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
      />,
    );
    const nav = screen.getByTestId("app-navigation");
    expect(nav).toBeInTheDocument();
  });

  it("renders the brand name", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
      />,
    );
    expect(screen.getByText("t:brand")).toBeInTheDocument();
  });

  it("renders navigation links for all apps", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
      />,
    );
    expect(screen.getByTestId("nav-link-store")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-admin")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-landing")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-studio")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-payments")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-auth")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-playground")).toBeInTheDocument();
  });

  it("marks the current app link with aria-current=page", () => {
    render(
      <AppNavigation
        currentApp="admin"
        urls={defaultUrls}
        locales={defaultLocales}
      />,
    );
    expect(screen.getByTestId("nav-link-admin")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("nav-link-store")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("appends locale to relative URLs", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
      />,
    );
    expect(screen.getByTestId("nav-link-store")).toHaveAttribute(
      "href",
      "/store/en",
    );
  });

  it("appends locale to absolute URLs", () => {
    const urls = { ...defaultUrls, store: "http://localhost:5001" };
    render(
      <AppNavigation currentApp="admin" urls={urls} locales={defaultLocales} />,
    );
    expect(screen.getByTestId("nav-link-store")).toHaveAttribute(
      "href",
      "http://localhost:5001/en",
    );
  });

  it("displays user email when provided", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
        userEmail="user@example.com"
      />,
    );
    expect(screen.getByTestId("nav-user-email")).toHaveTextContent(
      "user@example.com",
    );
  });

  it("does not display user email when not provided", () => {
    render(
      <AppNavigation
        currentApp="store"
        urls={defaultUrls}
        locales={defaultLocales}
      />,
    );
    expect(screen.queryByTestId("nav-user-email")).not.toBeInTheDocument();
  });
});
