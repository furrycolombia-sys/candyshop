import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("./DynamicFormField", () => ({
  DynamicFormField: ({ field }: { field: { id: string } }) => (
    <div data-testid={`dynamic-field-${field.id}`} />
  ),
}));

import { FormFieldsSection } from "./FormFieldsSection";

const baseField = {
  id: "field-1",
  type: "text" as const,
  label_en: "Name",
  required: false,
};

describe("FormFieldsSection", () => {
  it("returns null when fields array is empty", () => {
    const { container } = render(
      <FormFieldsSection
        fields={[]}
        buyerSubmission={{}}
        isDisabled={false}
        label="Payment Info"
        onBuyerSubmissionChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the section label when fields are present", () => {
    render(
      <FormFieldsSection
        fields={[baseField]}
        buyerSubmission={{}}
        isDisabled={false}
        label="Payment Info"
        onBuyerSubmissionChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Payment Info")).toBeInTheDocument();
  });

  it("renders a DynamicFormField for each field", () => {
    const fields = [
      { ...baseField, id: "f-1" },
      { ...baseField, id: "f-2" },
    ];
    render(
      <FormFieldsSection
        fields={fields}
        buyerSubmission={{}}
        isDisabled={false}
        label="Info"
        onBuyerSubmissionChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("dynamic-field-f-1")).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-field-f-2")).toBeInTheDocument();
  });
});
