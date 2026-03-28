import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AccordionItem } from "./AccordionItem";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const theme = {
  bg: "bg-mint",
  bgLight: "bg-mint/15",
  border: "border-mint",
  text: "text-mint",
  badgeBg: "bg-mint",
  rowEven: "bg-mint/5",
  rowOdd: "bg-mint/15",
  accent: "--mint",
};

describe("AccordionItem", () => {
  it("renders question text", () => {
    render(
      <AccordionItem
        question="What is this?"
        answer="This is a test."
        index={0}
        theme={theme}
      />,
    );
    expect(screen.getByText("What is this?")).toBeInTheDocument();
  });

  it("does not show answer by default", () => {
    render(
      <AccordionItem
        question="Q"
        answer="The answer"
        index={0}
        theme={theme}
      />,
    );
    expect(screen.queryByText("The answer")).not.toBeInTheDocument();
  });

  it("shows answer after clicking toggle", () => {
    render(
      <AccordionItem
        question="Q"
        answer="The answer"
        index={0}
        theme={theme}
      />,
    );
    fireEvent.click(screen.getByTestId("accordion-toggle-0"));
    expect(screen.getByText("The answer")).toBeInTheDocument();
    expect(screen.getByTestId("accordion-answer-0")).toBeInTheDocument();
  });

  it("hides answer after clicking toggle twice", () => {
    render(
      <AccordionItem
        question="Q"
        answer="The answer"
        index={0}
        theme={theme}
      />,
    );
    const toggle = screen.getByTestId("accordion-toggle-0");
    fireEvent.click(toggle);
    expect(screen.getByText("The answer")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText("The answer")).not.toBeInTheDocument();
  });

  it("has aria-expanded attribute", () => {
    render(<AccordionItem question="Q" answer="A" index={1} theme={theme} />);
    const toggle = screen.getByTestId("accordion-toggle-1");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
