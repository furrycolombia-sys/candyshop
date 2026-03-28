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
    // Without theme, filled class is "size-4 fill-foreground text-foreground"
    const filledStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("fill-foreground"),
    );
    expect(filledStars).toHaveLength(4);
  });

  it("renders 0 filled stars for rating 0", () => {
    const { container } = render(<RatingStars rating={0} />);
    const stars = container.querySelectorAll("svg");
    const filledStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("fill-foreground"),
    );
    expect(filledStars).toHaveLength(0);
  });

  it("renders 5 filled stars for rating 5", () => {
    const { container } = render(<RatingStars rating={5} />);
    const stars = container.querySelectorAll("svg");
    const filledStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("fill-foreground"),
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
      bg: "bg-pink",
      bgLight: "bg-pink/15",
      border: "border-pink",
      text: "text-pink",
      badgeBg: "bg-pink",
      rowEven: "bg-pink/5",
      rowOdd: "bg-pink/15",
      accent: "--pink",
    };
    const { container } = render(<RatingStars rating={3} theme={theme} />);
    const stars = container.querySelectorAll("svg");
    const themedStars = [...stars].filter((s) =>
      (s.getAttribute("class") ?? "").includes("text-pink"),
    );
    expect(themedStars).toHaveLength(3);
  });
});
