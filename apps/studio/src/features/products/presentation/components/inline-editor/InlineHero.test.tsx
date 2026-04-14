import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("./InlineImageCarousel", () => ({
  InlineImageCarousel: () => <div data-testid="image-carousel" />,
}));

vi.mock("./InlinePriceFields", () => ({
  InlinePriceFields: () => <div data-testid="price-fields" />,
}));

vi.mock("./InlineTagEditor", () => ({
  InlineTagEditor: () => <div data-testid="tag-editor" />,
}));

vi.mock("./InlineTextField", () => ({
  InlineTextField: ({ fieldNameEn }: { fieldNameEn: string }) => (
    <div data-testid={`text-field-${fieldNameEn}`} />
  ),
}));

import { InlineHero } from "./InlineHero";

function Wrapper() {
  const methods = useForm({
    defaultValues: {
      name_en: "Product",
      name_es: "Producto",
      tagline_en: "",
      tagline_es: "",
      description_en: "Desc",
      description_es: "Desc",
      category: "merch",
      type: "merch",
      is_active: true,
      max_quantity: null,
      refundable: true,
      images: [],
      price_cop: 0,
      price_usd: null,
      discount_percent: null,
      tags: [],
    },
  });

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InlineHero control={methods.control as any} />
    </FormProvider>
  );
}

describe("InlineHero", () => {
  it("renders the hero section", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-hero")).toBeInTheDocument();
  });

  it("renders name text field", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("text-field-name_en")).toBeInTheDocument();
  });

  it("renders image carousel", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("image-carousel")).toBeInTheDocument();
  });

  it("renders price fields", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("price-fields")).toBeInTheDocument();
  });

  it("renders tag editor", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("tag-editor")).toBeInTheDocument();
  });

  it("renders description text field", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("text-field-description_en")).toBeInTheDocument();
  });

  it("renders category badge", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("hero-category")).toBeInTheDocument();
  });

  it("renders stock status", () => {
    render(<Wrapper />);
    // Should show in stock since is_active=true and max_quantity=null
    expect(screen.getByText("inStock")).toBeInTheDocument();
  });
});

function WrapperWithProps(props: Record<string, unknown>) {
  const methods = useForm({
    defaultValues: {
      name_en: "Product",
      name_es: "Producto",
      tagline_en: "",
      tagline_es: "",
      description_en: "Desc",
      description_es: "Desc",
      category: "merch",
      type: "merch",
      is_active: true,
      max_quantity: null,
      refundable: null,
      images: [],
      price_cop: 0,
      price_usd: null,
      discount_percent: null,
      tags: [],
      ...props,
    },
  });

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InlineHero control={methods.control as any} />
    </FormProvider>
  );
}

describe("InlineHero branches", () => {
  it("shows out of stock when inactive", () => {
    render(<WrapperWithProps is_active={false} />);
    expect(screen.getByText("outOfStock")).toBeInTheDocument();
  });

  it("shows out of stock when max_quantity is 0", () => {
    render(<WrapperWithProps max_quantity={0} />);
    expect(screen.getByText("outOfStock")).toBeInTheDocument();
  });

  it("shows refundable badge when refundable is true", () => {
    render(<WrapperWithProps refundable={true} />);
    expect(screen.getByText("refundable")).toBeInTheDocument();
  });

  it("shows non-refundable badge when refundable is false", () => {
    render(<WrapperWithProps refundable={false} />);
    expect(screen.getByText("nonRefundable")).toBeInTheDocument();
  });

  it("shows no refund badge when refundable is null", () => {
    render(<WrapperWithProps refundable={null} />);
    expect(screen.queryByText("refundable")).not.toBeInTheDocument();
    expect(screen.queryByText("nonRefundable")).not.toBeInTheDocument();
  });

  it("shows quantity input when max_quantity is set", () => {
    render(<WrapperWithProps max_quantity={5} />);
    expect(screen.getByTestId("inline-stock-quantity")).toBeInTheDocument();
  });

  it("shows unlimited checkbox when max_quantity is null", () => {
    render(<WrapperWithProps max_quantity={null} />);
    expect(screen.getByTestId("inline-stock-unlimited")).toBeInTheDocument();
  });
});
