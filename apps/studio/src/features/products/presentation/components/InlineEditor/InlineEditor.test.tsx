import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";

// next/dynamic uses loadable.shared-runtime.js which calls React.useContext via a
// separate require("react") copy that resolves to null in Vitest jsdom. Replace
// it with React.lazy so the component renders through the normal React path.
vi.mock("next/dynamic", () => ({
  default: (
    fn: () => Promise<{ default: React.ComponentType } | React.ComponentType>,
  ) => React.lazy(fn as () => Promise<{ default: React.ComponentType }>),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => vi.fn(),
}));

vi.mock("@/features/products/domain/validationSchema", () => ({
  createProductFormSchema: () => ({}),
}));

vi.mock("@/shared/domain/categoryConstants", () => ({
  getCategoryTheme: () => ({
    bg: "var(--mint)",
    bgLight: "color-mix(in srgb, var(--mint) 15%, transparent)",
    border: "var(--mint)",
    text: "var(--mint)",
    badgeBg: "var(--mint)",
    rowEven: "color-mix(in srgb, var(--mint) 5%, transparent)",
    rowOdd: "color-mix(in srgb, var(--mint) 15%, transparent)",
    foreground: "var(--candy-text)",
    accent: "--mint",
  }),
}));

vi.mock("./EditorToolbar", () => ({
  EditorToolbar: (props: { isEdit: boolean; isSaving: boolean }) => (
    <div
      data-testid="editor-toolbar"
      data-edit={props.isEdit}
      data-saving={props.isSaving}
    />
  ),
}));

vi.mock("./FormErrorBanner", () => ({
  FormErrorBanner: () => <div data-testid="form-error-banner" />,
}));

vi.mock("./MutationErrorBanner", () => ({
  MutationErrorBanner: ({ message }: { message: string }) => (
    <div data-testid="mutation-error-banner">{message}</div>
  ),
}));

vi.mock("./InlineHero", () => ({
  InlineHero: () => <div data-testid="inline-hero" />,
}));

vi.mock("./InlineSections", () => ({
  InlineSections: () => <div data-testid="inline-sections" />,
}));

vi.mock("./InlineTextField", () => ({
  InlineTextField: ({ fieldNameEn }: { fieldNameEn: string }) => (
    <div data-testid={`inline-text-${fieldNameEn}`} />
  ),
}));

import { InlineEditor } from "./InlineEditor";

async function renderEditor(ui: React.ReactElement) {
  render(<React.Suspense fallback={null}>{ui}</React.Suspense>);
  // Wait for the React.lazy-loaded InlineSections to appear, which confirms the
  // full component tree has resolved before any assertion runs.
  await screen.findByTestId("inline-sections");
}

describe("InlineEditor", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
    isEdit: false,
  };

  it("renders the form", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(screen.getByTestId("inline-editor")).toBeInTheDocument();
  });

  it("renders the toolbar", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();
  });

  it("renders the form error banner", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(screen.getByTestId("form-error-banner")).toBeInTheDocument();
  });

  it("renders the hero section", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(screen.getByTestId("inline-hero")).toBeInTheDocument();
  });

  it("renders the sections component", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(screen.getByTestId("inline-sections")).toBeInTheDocument();
  });

  it("renders long description text field", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(
      screen.getByTestId("inline-text-long_description_en"),
    ).toBeInTheDocument();
  });

  it("does not show mutation error banner when no error", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    expect(
      screen.queryByTestId("mutation-error-banner"),
    ).not.toBeInTheDocument();
  });

  it("shows mutation error banner when error is provided", async () => {
    await renderEditor(
      <InlineEditor
        {...defaultProps}
        mutationError={new Error("Server error")}
      />,
    );
    expect(screen.getByTestId("mutation-error-banner")).toHaveTextContent(
      "Server error",
    );
  });

  it("passes isEdit to the toolbar", async () => {
    await renderEditor(<InlineEditor {...defaultProps} isEdit={true} />);
    expect(screen.getByTestId("editor-toolbar")).toHaveAttribute(
      "data-edit",
      "true",
    );
  });

  it("passes isSaving to the toolbar", async () => {
    await renderEditor(<InlineEditor {...defaultProps} isSubmitting={true} />);
    expect(screen.getByTestId("editor-toolbar")).toHaveAttribute(
      "data-saving",
      "true",
    );
  });

  it("renders as a form element", async () => {
    await renderEditor(<InlineEditor {...defaultProps} />);
    const form = screen.getByTestId("inline-editor");
    expect(form.tagName).toBe("FORM");
  });
});
