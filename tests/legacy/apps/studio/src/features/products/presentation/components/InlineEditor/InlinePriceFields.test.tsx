import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  POPULAR_CURRENCIES: ["USD", "EUR", "COP"],
}));

vi.mock("./PriceInput", () => ({
  PriceInput: ({ testId, value }: { testId: string; value: unknown }) => (
    <input data-testid={testId} defaultValue={String(value ?? "")} />
  ),
}));

import { InlinePriceFields } from "./InlinePriceFields";

function Wrapper() {
  const methods = useForm({
    defaultValues: {
      price: 50_000,
      currency: "COP",
      compare_at_price: null,
    },
  });

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InlinePriceFields control={methods.control as any} />
    </FormProvider>
  );
}

describe("InlinePriceFields", () => {
  it("renders the container", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-price-fields")).toBeInTheDocument();
  });

  it("renders price input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-price")).toBeInTheDocument();
  });

  it("renders currency selector", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-currency")).toBeInTheDocument();
  });

  it("renders compare-at price input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-compare-price")).toBeInTheDocument();
  });

  it("renders price label", () => {
    render(<Wrapper />);
    expect(screen.getByText("price")).toBeInTheDocument();
  });

  it("renders compare-at label", () => {
    render(<Wrapper />);
    expect(screen.getByText("comparePrice")).toBeInTheDocument();
  });
});
