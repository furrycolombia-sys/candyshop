import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let mockLocale = "en";

vi.mock("next-intl", () => ({
  useLocale: () => mockLocale,
}));

import { ProductName } from "@/features/users/presentation/components/delegates/ProductName";

const product = { name_en: "Widget", name_es: "Artilugio" };

describe("ProductName", () => {
  it("renders the English name when locale is en", () => {
    mockLocale = "en";
    render(<ProductName product={product} />);
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });

  it("renders the Spanish name when locale is es", () => {
    mockLocale = "es";
    render(<ProductName product={product} />);
    expect(screen.getByText("Artilugio")).toBeInTheDocument();
  });

  it("renders the English name for any non-es locale", () => {
    mockLocale = "fr";
    render(<ProductName product={product} />);
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });
});
