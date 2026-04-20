import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { FormErrorBanner } from "./FormErrorBanner";

describe("FormErrorBanner", () => {
  it("renders nothing when there are no errors", () => {
    const { container } = render(<FormErrorBanner errors={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders error messages from field errors", () => {
    const errors = {
      name_en: { message: "Name is required", type: "required" },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<FormErrorBanner errors={errors as any} />);
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("renders multiple error messages", () => {
    const errors = {
      name_en: { message: "Name required", type: "required" },
      price_cop: { message: "Price required", type: "required" },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<FormErrorBanner errors={errors as any} />);
    expect(screen.getByText("Name required")).toBeInTheDocument();
    expect(screen.getByText("Price required")).toBeInTheDocument();
  });

  it("has role=alert for accessibility", () => {
    const errors = {
      name_en: { message: "Error", type: "required" },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<FormErrorBanner errors={errors as any} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("can be dismissed", () => {
    const errors = {
      name_en: { message: "Error", type: "required" },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<FormErrorBanner errors={errors as any} />);

    const dismissBtn = screen.getByTestId("form-error-dismiss");
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("extracts root errors from arrays", () => {
    const errors = {
      sections: {
        root: { message: "Section error", type: "custom" },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<FormErrorBanner errors={errors as any} />);
    expect(screen.getByText("Section error")).toBeInTheDocument();
  });
});
