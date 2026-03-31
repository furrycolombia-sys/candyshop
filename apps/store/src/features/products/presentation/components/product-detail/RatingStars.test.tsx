/* eslint-disable testing-library/no-node-access */
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { RatingStars } from "@/features/products/presentation/components/product-detail/RatingStars";

describe("RatingStars", () => {
  it("renders 5 stars", () => {
    const { container } = render(<RatingStars rating={3} />);
    const stars = container.querySelectorAll("svg");
    expect(stars).toHaveLength(5);
  });

  it("fills stars based on rounded rating", () => {
    const { container } = render(<RatingStars rating={4} />);
    const stars = container.querySelectorAll("svg");
    const filledStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("fill-current"),
    );
    expect(filledStars).toHaveLength(4);
  });

  it("renders 0 filled stars for rating 0", () => {
    const { container } = render(<RatingStars rating={0} />);
    const stars = container.querySelectorAll("svg");
    const filledStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("fill-current"),
    );
    expect(filledStars).toHaveLength(0);
  });

  it("renders 5 filled stars for rating 5", () => {
    const { container } = render(<RatingStars rating={5} />);
    const stars = container.querySelectorAll("svg");
    const filledStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("fill-current"),
    );
    expect(filledStars).toHaveLength(5);
  });

  it("renders unfilled stars with muted class", () => {
    const { container } = render(<RatingStars rating={2} />);
    const stars = container.querySelectorAll("svg");
    const mutedStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("text-muted-foreground"),
    );
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
    const { container } = render(<RatingStars rating={3} theme={theme} />);
    const stars = container.querySelectorAll("svg");
    const themedStars = [...stars].filter(
      (s) => s.getAttribute("style")?.includes("var(--pink)") ?? false,
    );
    expect(themedStars).toHaveLength(3);
  });
});
