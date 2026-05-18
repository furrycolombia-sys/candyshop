import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
    if (values) return `${namespace ?? ""}.${key}:${JSON.stringify(values)}`;
    return `${namespace ?? ""}.${key}`;
  },
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { PrivacyPage } from "./PrivacyPage";

describe("PrivacyPage", () => {
  it("renders the legal-privacy-page test id", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("legal-privacy-page")).toBeInTheDocument();
  });

  it("renders the page title heading", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a last-updated line", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("legal-last-updated")).toBeInTheDocument();
    expect(screen.getByTestId("legal-last-updated")).not.toBeEmpty();
  });

  it("renders all 9 section headings", () => {
    render(<PrivacyPage />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBe(9);
  });
});
