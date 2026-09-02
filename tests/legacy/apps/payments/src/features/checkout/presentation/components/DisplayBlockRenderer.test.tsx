import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  i18nField: (obj: Record<string, unknown>, key: string) =>
    (obj[`${key}_en`] as string) ?? "",
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}));

vi.mock("./ImageBlock", () => ({
  ImageBlock: ({ block }: { block: { id: string } }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid={`image-block-${block.id}`} alt="" />
  ),
}));

import { DisplayBlockRenderer } from "./DisplayBlockRenderer";

describe("DisplayBlockRenderer", () => {
  it("renders text block content with markdown", () => {
    const block = {
      id: "b1",
      type: "text" as const,
      content_en: "Hello **world**",
    };
    render(<DisplayBlockRenderer block={block} />);
    expect(screen.getByText("Hello **world**")).toBeInTheDocument();
  });

  it("renders image block via ImageBlock component", () => {
    const block = {
      id: "b2",
      type: "image" as const,
      url: "https://example.com/img.png",
    };
    render(<DisplayBlockRenderer block={block} />);
    expect(screen.getByTestId("image-block-b2")).toBeInTheDocument();
  });

  it("renders video block as iframe", () => {
    const block = {
      id: "b3",
      type: "video" as const,
      url: "https://www.youtube.com/embed/abc123",
    };
    render(<DisplayBlockRenderer block={block} />);
    const iframe = screen.getByTestId("display-block-b3-iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/abc123",
    );
  });

  it("renders link block as anchor", () => {
    const block = {
      id: "b4",
      type: "link" as const,
      url: "https://example.com",
      label_en: "Visit us",
    };
    render(<DisplayBlockRenderer block={block} />);
    const link = screen.getByRole("link", { name: "Visit us" });
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders url block with anchor inside container", () => {
    const block = {
      id: "b5",
      type: "url" as const,
      url: "https://example.com/resource",
      label_en: "Resource",
    };
    render(<DisplayBlockRenderer block={block} />);
    expect(screen.getByRole("link", { name: "Resource" })).toHaveAttribute(
      "href",
      "https://example.com/resource",
    );
  });

  it("wraps block in a div with test id", () => {
    const block = {
      id: "b6",
      type: "text" as const,
      content_en: "Content",
    };
    render(<DisplayBlockRenderer block={block} />);
    expect(screen.getByTestId("display-block-b6")).toBeInTheDocument();
  });
});
