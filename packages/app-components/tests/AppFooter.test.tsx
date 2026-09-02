import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppFooter } from "@app-components/components/AppFooter";

const defaultProps = {
  copyrightSuffix: "Furrycolombia. All rights reserved.",
  termsLabel: "Terms",
  privacyLabel: "Privacy",
  termsHref: "https://example.com/en/legal/terms",
  privacyHref: "https://example.com/en/legal/privacy",
};

describe("AppFooter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-06-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the current year + copyrightSuffix", () => {
    render(<AppFooter {...defaultProps} />);
    expect(screen.getByTestId("app-footer")).toHaveTextContent(
      "© 2030 Furrycolombia. All rights reserved.",
    );
  });

  it("renders the terms link with passed label and href", () => {
    render(<AppFooter {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link).toHaveAttribute("href", defaultProps.termsHref);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the privacy link with passed label and href", () => {
    render(<AppFooter {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Privacy" });
    expect(link).toHaveAttribute("href", defaultProps.privacyHref);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("exposes a stable test id", () => {
    render(<AppFooter {...defaultProps} />);
    expect(screen.getByTestId("app-footer")).toBeInTheDocument();
  });

  it("renders the localized labels passed in (not hardcoded English)", () => {
    render(
      <AppFooter
        {...defaultProps}
        copyrightSuffix="Furrycolombia. Todos los derechos reservados."
        termsLabel="Términos"
        privacyLabel="Privacidad"
      />,
    );
    expect(screen.getByTestId("app-footer")).toHaveTextContent(
      "© 2030 Furrycolombia. Todos los derechos reservados.",
    );
    expect(screen.getByRole("link", { name: "Términos" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Privacidad" }),
    ).toBeInTheDocument();
  });
});
