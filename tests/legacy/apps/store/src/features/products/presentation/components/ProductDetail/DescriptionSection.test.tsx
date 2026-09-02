/* eslint-disable testing-library/no-node-access */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { DescriptionSection } from "./DescriptionSection";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

describe("DescriptionSection", () => {
  it("renders title", () => {
    render(<DescriptionSection description="Hello world" />);
    expect(screen.getByTestId("description-title")).toHaveTextContent(
      "detail.about",
    );
  });

  it("renders single paragraph", () => {
    render(<DescriptionSection description="Hello world" />);
    expect(screen.getByTestId("description-body")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders multiple paragraphs split by double newline", () => {
    render(
      <DescriptionSection description={"Para one\n\nPara two\n\nPara three"} />,
    );
    expect(screen.getByText("Para one")).toBeInTheDocument();
    expect(screen.getByText("Para two")).toBeInTheDocument();
    expect(screen.getByText("Para three")).toBeInTheDocument();
  });

  it("filters out empty paragraphs", () => {
    render(<DescriptionSection description={"Para one\n\n\n\nPara two"} />);
    const body = screen.getByTestId("description-body");
    const paragraphs = body.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
  });
});
