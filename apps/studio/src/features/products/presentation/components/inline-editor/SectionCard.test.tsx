/* eslint-disable react/button-has-type */
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/products/application/useLangToggle", () => ({
  useLangToggle: () => ({ lang: "en", toggleLang: vi.fn() }),
}));

vi.mock("@/features/products/application/useAutoResize", () => ({
  useAutoResize: () => vi.fn(),
}));

vi.mock("./AutoTextarea", () => ({
  AutoTextarea: ({
    value,
    placeholder,
    ...props
  }: {
    value?: string;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      placeholder={placeholder}
      data-testid={props["data-testid"] as string}
      readOnly
    />
  ),
}));

vi.mock("./InlineRemoveButton", () => ({
  InlineRemoveButton: ({
    onClick,
    ariaLabel,
  }: {
    onClick: () => void;
    ariaLabel: string;
  }) => (
    <button
      data-testid="inline-remove-btn"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      X
    </button>
  ),
}));

vi.mock("./SectionItemsAccordion", () => ({
  SectionItemsAccordion: () => (
    <div data-testid="section-items-accordion">Accordion</div>
  ),
}));

vi.mock("./SectionItemsCards", () => ({
  SectionItemsCards: () => <div data-testid="section-items-cards">Cards</div>,
}));

vi.mock("./SectionItemsGallery", () => ({
  SectionItemsGallery: () => (
    <div data-testid="section-items-gallery">Gallery</div>
  ),
}));

vi.mock("./SectionItemsTwoColumn", () => ({
  SectionItemsTwoColumn: () => (
    <div data-testid="section-items-two-column">TwoColumn</div>
  ),
}));

import { SectionCard } from "./SectionCard";

const mockTheme = {
  bg: "bg-mint",
  bgLight: "bg-mint/15",
  border: "border-mint",
  text: "text-mint",
  badgeBg: "bg-mint",
  rowEven: "bg-mint/5",
  rowOdd: "bg-mint/15",
  accent: "--mint",
};

const mockDragProvided = {
  innerRef: vi.fn(),
  draggableProps: {},
  dragHandleProps: {},
};

function Wrapper({
  sectionType = "cards",
  isCollapsed = false,
  onToggleCollapse = vi.fn(),
  onRemove = vi.fn(),
}: {
  sectionType?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRemove?: () => void;
}) {
  const methods = useForm({
    defaultValues: {
      sections: [
        {
          name_en: "Test Section",
          name_es: "Seccion Prueba",
          type: sectionType,
          sort_order: 0,
          items: [],
        },
      ],
    },
  });

  return (
    <FormProvider {...methods}>
      <SectionCard
        sectionIndex={0}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={methods.control as any}
        theme={mockTheme}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dragProvided={mockDragProvided as any}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onRemove={onRemove}
        itemMoveRegistry={new Map()}
      />
    </FormProvider>
  );
}

describe("SectionCard", () => {
  it("renders the section card", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
  });

  it("renders section name input", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("section-name-0")).toBeInTheDocument();
  });

  it("renders type selector", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("section-type-0")).toBeInTheDocument();
  });

  it("renders collapse toggle", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("section-collapse-0")).toBeInTheDocument();
  });

  it("renders remove button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-remove-btn")).toBeInTheDocument();
  });

  it("calls onRemove when remove is clicked", () => {
    const onRemove = vi.fn();
    render(<Wrapper onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId("inline-remove-btn"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("calls onToggleCollapse when collapse button is clicked", () => {
    const onToggleCollapse = vi.fn();
    render(<Wrapper onToggleCollapse={onToggleCollapse} />);
    fireEvent.click(screen.getByTestId("section-collapse-0"));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it("renders cards section items by default", () => {
    render(<Wrapper sectionType="cards" />);
    expect(screen.getByTestId("section-items-cards")).toBeInTheDocument();
  });

  it("renders accordion section items when type is accordion", () => {
    render(<Wrapper sectionType="accordion" />);
    expect(screen.getByTestId("section-items-accordion")).toBeInTheDocument();
  });

  it("renders gallery section items when type is gallery", () => {
    render(<Wrapper sectionType="gallery" />);
    expect(screen.getByTestId("section-items-gallery")).toBeInTheDocument();
  });

  it("renders two-column section items when type is two-column", () => {
    render(<Wrapper sectionType="two-column" />);
    expect(screen.getByTestId("section-items-two-column")).toBeInTheDocument();
  });

  it("hides items when collapsed", () => {
    render(<Wrapper isCollapsed />);
    expect(screen.queryByTestId("section-items-cards")).not.toBeInTheDocument();
  });

  it("shows items when not collapsed", () => {
    render(<Wrapper isCollapsed={false} />);
    expect(screen.getByTestId("section-items-cards")).toBeInTheDocument();
  });

  it("has aria-expanded attribute on collapse toggle", () => {
    render(<Wrapper isCollapsed={false} />);
    expect(screen.getByTestId("section-collapse-0")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("has aria-expanded=false when collapsed", () => {
    render(<Wrapper isCollapsed />);
    expect(screen.getByTestId("section-collapse-0")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
