import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { InlineTagEditor } from "./InlineTagEditor";

function Wrapper({ initialTags = "" }: { initialTags?: string }) {
  const methods = useForm({
    defaultValues: { tags: initialTags },
  });

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InlineTagEditor control={methods.control as any} />
    </FormProvider>
  );
}

describe("InlineTagEditor", () => {
  it("renders the tag editor container", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-tag-editor")).toBeInTheDocument();
  });

  it("shows add button initially (input hidden)", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-tag-add-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("inline-tag-input")).not.toBeInTheDocument();
  });

  it("shows input when add button is clicked", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId("inline-tag-add-btn"));
    expect(screen.getByTestId("inline-tag-input")).toBeInTheDocument();
  });

  it("renders existing tags as badges", () => {
    render(<Wrapper initialTags="cool, new, hot" />);
    expect(screen.getByText(/#cool/)).toBeInTheDocument();
    expect(screen.getByText(/#new/)).toBeInTheDocument();
    expect(screen.getByText(/#hot/)).toBeInTheDocument();
  });

  it("adds a tag on Enter key", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId("inline-tag-add-btn"));
    const input = screen.getByTestId("inline-tag-input");
    fireEvent.change(input, { target: { value: "newtag" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/#newtag/)).toBeInTheDocument();
  });

  it("removes a tag when remove button is clicked", () => {
    render(<Wrapper initialTags="alpha, beta" />);
    const removeButtons = screen.getAllByLabelText("removeTag");
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByText(/#alpha/)).not.toBeInTheDocument();
    expect(screen.getByText(/#beta/)).toBeInTheDocument();
  });

  it("hides input on Escape key", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId("inline-tag-add-btn"));
    fireEvent.keyDown(screen.getByTestId("inline-tag-input"), {
      key: "Escape",
    });
    expect(screen.queryByTestId("inline-tag-input")).not.toBeInTheDocument();
  });

  it("does not add duplicate tags", () => {
    render(<Wrapper initialTags="alpha" />);
    fireEvent.click(screen.getByTestId("inline-tag-add-btn"));
    const input = screen.getByTestId("inline-tag-input");
    fireEvent.change(input, { target: { value: "alpha" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const alphas = screen.getAllByText(/#alpha/);
    expect(alphas).toHaveLength(1);
  });

  it("adds tag on blur", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId("inline-tag-add-btn"));
    const input = screen.getByTestId("inline-tag-input");
    fireEvent.change(input, { target: { value: "blurtag" } });
    fireEvent.blur(input);
    expect(screen.getByText(/#blurtag/)).toBeInTheDocument();
  });
});
