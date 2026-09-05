import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { ImageBlock } from "./ImageBlock";

const baseBlock = {
  id: "block-1",
  type: "image" as const,
  url: "https://example.com/image.png",
  sort_order: 0,
};

describe("ImageBlock", () => {
  it("renders an img when url is set", () => {
    render(<ImageBlock block={baseBlock} alt="Test image" />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/image.png",
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Test image");
  });

  it("shows fallback when block url is empty", () => {
    render(<ImageBlock block={{ ...baseBlock, url: "" }} alt="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("imageUnavailable")).toBeInTheDocument();
  });

  it("shows fallback on image load error", () => {
    render(<ImageBlock block={baseBlock} alt="Test" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("imageUnavailable")).toBeInTheDocument();
  });
});
