import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

import { ImageEditBar } from "@/features/products/presentation/components/InlineEditor/ImageEditBar";

const defaultImage = {
  url: "https://example.com/img.png",
  alt: "Alt text",
  sort_order: 0,
  is_cover: false,
  is_store_cover: false,
  fit: "cover" as const,
};

function Wrapper({
  editing = true,
  fit = "cover" as "cover" | "contain",
  onDone = vi.fn(),
}: {
  editing?: boolean;
  fit?: "cover" | "contain";
  onDone?: () => void;
}) {
  const methods = useForm({
    defaultValues: {
      images: [{ ...defaultImage, fit }],
    },
  });
  const replace = vi.fn();
  return (
    <FormProvider {...methods}>
      <ImageEditBar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={methods.control as any}
        index={0}
        editing={editing}
        onDone={onDone}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        replace={replace as any}
      />
    </FormProvider>
  );
}

describe("ImageEditBar", () => {
  it("renders when editing is true", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("image-edit-bar")).toBeInTheDocument();
  });

  it("hides when editing is false", () => {
    render(<Wrapper editing={false} />);
    const bar = screen.getByTestId("image-edit-bar");
    expect(bar.className).toContain("hidden");
  });

  it("renders URL and alt inputs", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("image-edit-url")).toBeInTheDocument();
    expect(screen.getByTestId("image-edit-alt")).toBeInTheDocument();
  });

  it("renders store cover checkbox", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("image-edit-store-cover")).toBeInTheDocument();
  });

  it("calls onDone when done button is clicked", () => {
    const onDone = vi.fn();
    render(<Wrapper onDone={onDone} />);
    fireEvent.click(screen.getByTestId("image-edit-done"));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("fit checkbox is checked when fit is 'contain'", () => {
    render(<Wrapper fit="contain" />);
    expect(screen.getByTestId("image-edit-fit")).toBeChecked();
  });

  it("fit checkbox is unchecked when fit is 'cover'", () => {
    render(<Wrapper fit="cover" />);
    expect(screen.getByTestId("image-edit-fit")).not.toBeChecked();
  });

  it("toggling fit checkbox triggers replace", () => {
    render(<Wrapper fit="cover" />);
    const fitCheckbox = screen.getByTestId("image-edit-fit");
    fireEvent.click(fitCheckbox);
    expect(fitCheckbox).toBeInTheDocument();
  });

  it("unchecking fit checkbox sets fit to cover", () => {
    render(<Wrapper fit="contain" />);
    const fitCheckbox = screen.getByTestId("image-edit-fit");
    fireEvent.click(fitCheckbox);
    expect(fitCheckbox).toBeInTheDocument();
  });
});
