import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/products/application/useAutoResize", () => ({
  useAutoResize: () => vi.fn(),
}));

import { LangTextarea } from "./LangTextarea";

function Wrapper({ visible = true }: { visible?: boolean }) {
  const methods = useForm({
    defaultValues: { name_en: "Hello" },
  });
  return (
    <FormProvider {...methods}>
      <LangTextarea
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={methods.control as any}
        fieldName="name_en"
        placeholder="Enter name"
        isMultiline={false}
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
});
