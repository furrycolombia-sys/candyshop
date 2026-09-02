import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
      if (values) return `${namespace ?? ""}.${key}:${JSON.stringify(values)}`;
      return `${namespace ?? ""}.${key}`;
    },
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { TermsPage } from "@/features/legal/presentation/pages/TermsPage";

describe("TermsPage", () => {
  it("renders the legal-terms-page test id", () => {
    render(<TermsPage />);
    expect(screen.getByTestId("legal-terms-page")).toBeInTheDocument();
  });

  it("renders the page title heading", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a last-updated line", () => {
    render(<TermsPage />);
    expect(screen.getByTestId("legal-last-updated")).toBeInTheDocument();
    expect(screen.getByTestId("legal-last-updated")).not.toBeEmpty();
  });

  it("renders all 10 section headings", () => {
    render(<TermsPage />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBe(10);
  });
});
