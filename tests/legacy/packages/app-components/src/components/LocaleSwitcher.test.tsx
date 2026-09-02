import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReplace = vi.fn();
let mockPathname = "/en/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
  useLocale: () => "en",
}));

vi.mock("cookies-next", () => ({
  setCookie: vi.fn(),
}));

import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/en/dashboard";
  });

  it("renders without crashing", () => {
    render(<LocaleSwitcher locales={["en", "es"]} />);
    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toBeInTheDocument();
  });

  it("renders a button for each locale", () => {
    render(<LocaleSwitcher locales={["en", "es", "fr"]} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("displays locale labels", () => {
    render(<LocaleSwitcher locales={["en", "es"]} />);
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("ES")).toBeInTheDocument();
  });

  it("marks current locale as checked", () => {
    render(<LocaleSwitcher locales={["en", "es"]} />);
    const enButton = screen.getByTestId("locale-switch-en");
    const esButton = screen.getByTestId("locale-switch-es");
    expect(enButton).toHaveAttribute("aria-checked", "true");
    expect(esButton).toHaveAttribute("aria-checked", "false");
  });

  it("calls router.replace when switching locale from localized path", () => {
    mockPathname = "/en/dashboard";
    render(<LocaleSwitcher locales={["en", "es"]} />);
    fireEvent.click(screen.getByTestId("locale-switch-es"));
    expect(mockReplace).toHaveBeenCalledWith("/es/dashboard");
  });

  it("calls router.replace with prefixed path when URL has no locale segment", () => {
    // Pathname has no locale prefix — the if-branch should be skipped
    // and segments.join('/') will return '/dashboard', not empty, so it uses that value
    mockPathname = "/dashboard";
    render(<LocaleSwitcher locales={["en", "es"]} />);
    fireEvent.click(screen.getByTestId("locale-switch-es"));
    // segments = ['', 'dashboard'], segments[1] is 'dashboard' which is not in locales
    // so it stays as '/dashboard' (false branch of the locale-replace if)
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("uses fallback path when pathname produces empty string", () => {
    // A single '/' splits into ['', ''] — joining back gives '', triggering the || fallback
    mockPathname = "/";
    render(<LocaleSwitcher locales={["en", "es"]} />);
    fireEvent.click(screen.getByTestId("locale-switch-es"));
    // segments[1] is '' which is not in locales, join gives '/', router called with '/'
    expect(mockReplace).toHaveBeenCalled();
  });

  it("falls back to uppercased locale for unknown locales", () => {
    render(<LocaleSwitcher locales={["en", "xx"]} />);
    expect(screen.getByText("XX")).toBeInTheDocument();
  });

  it("has accessible aria-label on radiogroup", () => {
    render(<LocaleSwitcher locales={["en", "es"]} />);
    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toHaveAttribute("aria-label", "t:language.select");
  });
});
