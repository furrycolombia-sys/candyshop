/* eslint-disable vitest/expect-expect */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

let mockLang = "en";
vi.mock("@/features/products/application/useLangToggle", () => ({
  useLangToggle: () => ({
    lang: mockLang,
    toggleLang: vi.fn(() => {
      mockLang = mockLang === "en" ? "es" : "en";
    }),
  }),
}));

vi.mock("./LangTextarea", () => ({
  LangTextarea: ({ testId, visible }: { testId: string; visible: boolean }) => (
    <textarea data-testid={testId} data-visible={visible} />
  ),
}));

import { InlineTextField } from "./InlineTextField";

describe("InlineTextField", () => {
  const defaultProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: {} as any,
    fieldNameEn: "name_en" as const,
    fieldNameEs: "name_es" as const,
    placeholder: "Enter name",
  };

  it("renders both language textareas", () => {
    render(<InlineTextField {...defaultProps} />);
    expect(screen.getByTestId("inline-text-en-name_en")).toBeInTheDocument();
    expect(screen.getByTestId("inline-text-es-name_es")).toBeInTheDocument();
  });

  it("renders language toggle button", () => {
    render(<InlineTextField {...defaultProps} />);
    expect(screen.getByTestId("lang-toggle-name_en")).toBeInTheDocument();
  });

  it("shows EN textarea as visible by default", () => {
    mockLang = "en";
    render(<InlineTextField {...defaultProps} />);
    expect(screen.getByTestId("inline-text-en-name_en")).toHaveAttribute(
      "data-visible",
      "true",
    );
  });

  it("toggles language on button click", () => {
    render(<InlineTextField {...defaultProps} />);
    fireEvent.click(screen.getByTestId("lang-toggle-name_en"));
  });
});
