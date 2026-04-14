import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/en/dashboard",
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

  it("calls router.replace when switching locale", () => {
    render(<LocaleSwitcher locales={["en", "es"]} />);
    fireEvent.click(screen.getByTestId("locale-switch-es"));
    // startTransition is async, but the mock should have been invoked
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
