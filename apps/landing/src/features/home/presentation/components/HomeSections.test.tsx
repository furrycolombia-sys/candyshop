import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { CtaSection } from "./CtaSection";
import { FeaturesSection } from "./FeaturesSection";
import { RolesSection } from "./RolesSection";

describe("HomeSections", () => {
  it("renders the CTA links", () => {
    render(<CtaSection />);

    expect(screen.getByTestId("cta-section")).toBeInTheDocument();
    expect(screen.getByTestId("final-cta")).toHaveAttribute("href", "/store");
    expect(screen.getByTestId("final-payments")).toHaveAttribute(
      "href",
      "/payments",
    );
  });

  it("renders the landing category pills", () => {
    render(<FeaturesSection />);

    expect(screen.getByTestId("features-section")).toBeInTheDocument();
    expect(screen.getByTestId("category-commissions")).toBeInTheDocument();
    expect(screen.getByTestId("category-digital")).toBeInTheDocument();
  });

  it("renders both role cards with store links", () => {
    render(<RolesSection />);

    expect(screen.getByTestId("roles-section")).toBeInTheDocument();
    expect(screen.getByTestId("role-artists")).toBeInTheDocument();
    expect(screen.getByTestId("role-fans")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/store");
    expect(screen.getAllByRole("link")[1]).toHaveAttribute("href", "/store");
  });
});
