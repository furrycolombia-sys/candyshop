import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
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
      price_cop: 50_000,
      price_usd: "",
      compare_at_price_cop: null,
      compare_at_price_usd: null,
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

  it("renders COP price input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-price-cop")).toBeInTheDocument();
  });

  it("renders USD price input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-price-usd")).toBeInTheDocument();
  });

  it("renders compare-at COP price input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-compare-price-cop")).toBeInTheDocument();
  });

  it("renders compare-at USD price input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-compare-price-usd")).toBeInTheDocument();
  });

  it("renders price labels", () => {
    render(<Wrapper />);
    expect(screen.getByText("priceCop")).toBeInTheDocument();
    expect(screen.getByText("priceUsd")).toBeInTheDocument();
  });

  it("renders compare-at labels", () => {
    render(<Wrapper />);
    expect(screen.getByText("comparePriceCop")).toBeInTheDocument();
    expect(screen.getByText("comparePriceUsd")).toBeInTheDocument();
  });
});
