import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

const mockPathname = vi.fn(() => "/en");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { DelegateNav } from "./DelegateNav";

describe("DelegateNav", () => {
  it("renders all 3 navigation links", () => {
    render(<DelegateNav />);
    expect(screen.getByTestId("nav-products")).toBeInTheDocument();
    expect(screen.getByTestId("nav-delegates")).toBeInTheDocument();
    expect(screen.getByTestId("nav-delegated-orders")).toBeInTheDocument();
  });

  it("links have correct hrefs", () => {
    render(<DelegateNav />);
    expect(screen.getByTestId("nav-products")).toHaveAttribute("href", "/en");
    expect(screen.getByTestId("nav-delegates")).toHaveAttribute(
      "href",
      "/en/delegates",
    );
    expect(screen.getByTestId("nav-delegated-orders")).toHaveAttribute(
      "href",
      "/en/delegated-orders",
    );
  });

  it("highlights the active link based on current pathname", () => {
    mockPathname.mockReturnValue("/en/delegates");
    render(<DelegateNav />);
    const delegatesLink = screen.getByTestId("nav-delegates");
    expect(delegatesLink.className).toContain("font-medium");
    expect(delegatesLink.className).toContain("border-b-2");

    const productsLink = screen.getByTestId("nav-products");
    expect(productsLink.className).toContain("text-muted-foreground");
  });

  it("renders a visual separator between own and admin sections", () => {
    render(<DelegateNav />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});
