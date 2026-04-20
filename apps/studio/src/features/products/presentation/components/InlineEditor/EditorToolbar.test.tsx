/* eslint-disable react/button-has-type */
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("shared/types", () => ({
  SECTION_TYPES: ["cards", "accordion", "two-column", "gallery"],
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    />
  ),
}));

vi.mock("./TemplatePicker", () => ({
  TemplatePicker: () => <div data-testid="template-picker" />,
}));

import { EditorToolbar } from "./EditorToolbar";

function Wrapper({
  isSaving = false,
  isEdit = false,
  hasSections = false,
  onSave,
  onReset,
}: {
  isSaving?: boolean;
  isEdit?: boolean;
  hasSections?: boolean;
  onSave?: () => void;
  onReset?: () => void;
}) {
  const { control, register, setValue } = useForm({
    defaultValues: {
      type: "merch",
      category: "merch",
      featured: false,
      is_active: true,
      refundable: null,
    },
  });

  return (
    <EditorToolbar
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      control={control as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      register={register as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue={setValue as any}
      onSave={onSave ?? vi.fn()}
      isSaving={isSaving}
      isEdit={isEdit}
      onApplyTemplate={vi.fn()}
      onReset={onReset ?? vi.fn()}
      hasSections={hasSections}
    />
  );
}

describe("EditorToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders back link", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("editor-back-link")).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-save")).toBeInTheDocument();
  });

  it("shows saving state when isSaving", () => {
    render(<Wrapper isSaving />);
    const btn = screen.getByTestId("toolbar-save");
    expect(btn).toHaveTextContent("saving");
    expect(btn).toBeDisabled();
  });

  it("shows createProduct text when not editing", () => {
    render(<Wrapper isEdit={false} />);
    expect(screen.getByTestId("toolbar-save")).toHaveTextContent(
      "createProduct",
    );
  });

  it("shows saveProduct text when editing", () => {
    render(<Wrapper isEdit />);
    expect(screen.getByTestId("toolbar-save")).toHaveTextContent("saveProduct");
  });

  it("renders type selector buttons for all types", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-type-merch")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-type-digital")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-type-service")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-type-ticket")).toBeInTheDocument();
  });

  it("renders category selector", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-category")).toBeInTheDocument();
  });

  it("renders featured toggle", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-featured")).toBeInTheDocument();
  });

  it("renders active toggle", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-active")).toBeInTheDocument();
  });

  it("renders refundable select", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-refundable")).toBeInTheDocument();
  });

  it("renders template picker", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("template-picker")).toBeInTheDocument();
  });

  it("renders reset button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("toolbar-reset")).toBeInTheDocument();
  });

  it("calls onSave when save button is clicked", () => {
    const onSave = vi.fn();
    render(<Wrapper onSave={onSave} />);
    fireEvent.click(screen.getByTestId("toolbar-save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("confirms before resetting and calls onReset", () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    const onReset = vi.fn();
    render(<Wrapper onReset={onReset} />);
    fireEvent.click(screen.getByTestId("toolbar-reset"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it("does not call onReset when confirm is cancelled", () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const onReset = vi.fn();
    render(<Wrapper onReset={onReset} />);
    fireEvent.click(screen.getByTestId("toolbar-reset"));
    expect(onReset).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
