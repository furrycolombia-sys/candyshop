import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { RatingStars } from "@/features/products/presentation/components/ProductDetail/RatingStars";

describe("RatingStars", () => {
  it("renders 5 stars", () => {
    render(<RatingStars rating={3} />);
    expect(screen.getAllByTestId("rating-star")).toHaveLength(5);
  });

  it("fills stars based on rounded rating", () => {
    render(<RatingStars rating={4} />);
    const stars = screen.getAllByTestId("rating-star");

    const filledStars = stars.filter((s) => s.dataset.filled === "true");
    expect(filledStars).toHaveLength(4);
  });

  it("renders 0 filled stars for rating 0", () => {
    render(<RatingStars rating={0} />);
    const stars = screen.getAllByTestId("rating-star");

    const filledStars = stars.filter((s) => s.dataset.filled === "true");
    expect(filledStars).toHaveLength(0);
  });

  it("renders 5 filled stars for rating 5", () => {
    render(<RatingStars rating={5} />);
    const stars = screen.getAllByTestId("rating-star");

    const filledStars = stars.filter((s) => s.dataset.filled === "true");
    expect(filledStars).toHaveLength(5);
  });

  it("renders unfilled stars with muted class", () => {
    render(<RatingStars rating={2} />);
    const stars = screen.getAllByTestId("rating-star");

    const mutedStars = stars.filter((s) => s.dataset.filled === "false");
    expect(mutedStars).toHaveLength(3);
  });

  it("applies theme text color when theme is provided", () => {
    const theme = {
      bg: "var(--pink)",
      bgLight: "color-mix(in srgb, var(--pink) 15%, transparent)",
      border: "var(--pink)",
      text: "var(--pink)",
      badgeBg: "var(--pink)",
      rowEven: "color-mix(in srgb, var(--pink) 5%, transparent)",
      rowOdd: "color-mix(in srgb, var(--pink) 15%, transparent)",
      foreground: "var(--candy-text)",
      accent: "--pink",
    };
    render(<RatingStars rating={3} theme={theme} />);
    const stars = screen.getAllByTestId("rating-star");

    const themedStars = stars.filter(
      (s) => s.getAttribute("style")?.includes("var(--pink)") ?? false,
    );
    expect(themedStars).toHaveLength(3);
  });
});
