import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/products/application/hooks/useAutoResize", () => ({
  useAutoResize: () => vi.fn(),
}));

import { LangTextarea } from "./LangTextarea";

function Wrapper({
  visible = true,
  defaultValue = "Hello",
  isMultiline = false,
}: {
  visible?: boolean;
  defaultValue?: string;
  isMultiline?: boolean;
}) {
  const methods = useForm({
    defaultValues: { name_en: defaultValue },
  });
  return (
    <FormProvider {...methods}>
      <LangTextarea
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={methods.control as any}
        fieldName="name_en"
        placeholder="Enter name"
        isMultiline={isMultiline}
        className=""
        visible={visible}
        testId="lang-textarea"
      />
    </FormProvider>
  );
}

describe("LangTextarea", () => {
  it("renders textarea with value from form", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("lang-textarea")).toHaveValue("Hello");
  });

  it("updates value on change", () => {
    render(<Wrapper />);
    fireEvent.change(screen.getByTestId("lang-textarea"), {
      target: { value: "World" },
    });
    expect(screen.getByTestId("lang-textarea")).toHaveValue("World");
  });

  it("sets tabIndex to -1 when not visible", () => {
    render(<Wrapper visible={false} />);
    expect(screen.getByTestId("lang-textarea")).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("uses rows=1 when isMultiline is false", () => {
    render(<Wrapper isMultiline={false} />);
    expect(screen.getByTestId("lang-textarea")).toHaveAttribute("rows", "1");
  });

  it("uses rows=3 when isMultiline is true", () => {
    render(<Wrapper isMultiline={true} />);
    expect(screen.getByTestId("lang-textarea")).toHaveAttribute("rows", "3");
  });

  it("applies dashed border when value is empty", () => {
    render(<Wrapper defaultValue="" />);
    const textarea = screen.getByTestId("lang-textarea");
    expect(textarea).toHaveValue("");
    // Dashed border class indicates isEmpty=true branch was taken
    expect(textarea.className).toContain("border-dashed");
  });

  it("applies transparent border when value is non-empty", () => {
    render(<Wrapper defaultValue="Hello" />);
    const textarea = screen.getByTestId("lang-textarea");
    expect(textarea.className).toContain("border-transparent");
  });

  it("becomes empty after clearing the value", () => {
    render(<Wrapper defaultValue="Text" />);
    const textarea = screen.getByTestId("lang-textarea");
    fireEvent.change(textarea, { target: { value: "" } });
    expect(textarea).toHaveValue("");
    expect(textarea.className).toContain("border-dashed");
  });
});
