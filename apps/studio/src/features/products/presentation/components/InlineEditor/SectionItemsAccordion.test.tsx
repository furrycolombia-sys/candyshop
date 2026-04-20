import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Droppable: ({
    children,
  }: {
    children: (provided: unknown) => React.ReactNode;
  }) =>
    children({
      innerRef: vi.fn(),
      droppableProps: {},
      placeholder: null,
    }),
  Draggable: ({
    children,
  }: {
    children: (provided: unknown) => React.ReactNode;
  }) =>
    children({
      innerRef: vi.fn(),
      draggableProps: {},
      dragHandleProps: {},
    }),
}));

vi.mock("@/features/products/application/useLangToggle", () => ({
  useLangToggle: () => ({ lang: "en", toggleLang: vi.fn() }),
}));

vi.mock("@/features/products/application/useAutoResize", () => ({
  useAutoResize: () => vi.fn(),
}));

vi.mock("./InlineAddButton", () => ({
  InlineAddButton: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button type="button" data-testid="inline-add-btn" onClick={onClick}>
      {label}
    </button>
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
      type="button"
      data-testid="inline-remove-btn"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      Remove
    </button>
  ),
}));

import { SectionItemsAccordion } from "./SectionItemsAccordion";

const mockTheme = {
  bg: "var(--mint)",
  bgLight: "color-mix(in srgb, var(--mint) 15%, transparent)",
  border: "var(--mint)",
  text: "var(--mint)",
  badgeBg: "var(--mint)",
  rowEven: "color-mix(in srgb, var(--mint) 5%, transparent)",
  rowOdd: "color-mix(in srgb, var(--mint) 15%, transparent)",
  foreground: "var(--candy-text)",
  accent: "--mint",
};

function Wrapper({
  items = [],
}: {
  items?: Array<{
    title_en: string;
    title_es: string;
    description_en: string;
    description_es: string;
    icon: string;
    image_url: string;
    sort_order: number;
  }>;
}) {
  const methods = useForm({
    defaultValues: {
      sections: [
        {
          name_en: "Section",
          name_es: "",
          type: "accordion",
          sort_order: 0,
          items,
        },
      ],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldArrayMock: any = {
    fields: items.map((item, i) => ({ ...item, id: `item-${i}` })),
    append: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
  };

  return (
    <FormProvider {...methods}>
      <SectionItemsAccordion
        sectionIndex={0}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={methods.control as any}
        theme={mockTheme}
        fieldArray={fieldArrayMock}
        onAdd={vi.fn()}
      />
    </FormProvider>
  );
}

const sampleItem = {
  title_en: "Question",
  title_es: "Pregunta",
  description_en: "Answer",
  description_es: "Respuesta",
  icon: "",
  image_url: "",
  sort_order: 0,
};

describe("SectionItemsAccordion", () => {
  it("shows empty state when no items", () => {
    render(<Wrapper />);
    expect(screen.getByText("emptySection")).toBeInTheDocument();
  });

  it("renders add item button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-add-btn")).toBeInTheDocument();
  });

  it("renders items when provided", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
  });

  it("renders title input for item", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-item-title-0-0")).toBeInTheDocument();
  });

  it("renders remove button for each item", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("inline-remove-btn")).toBeInTheDocument();
  });

  it("renders language toggle for items", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(
      screen.getByTestId("section-item-lang-toggle-0-0"),
    ).toBeInTheDocument();
  });

  it("hides empty state when items exist", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.queryByText("emptySection")).not.toBeInTheDocument();
  });

  it("renders multiple items", () => {
    render(
      <Wrapper
        items={[sampleItem, { ...sampleItem, title_en: "Q2", sort_order: 1 }]}
      />,
    );
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-0-item-1")).toBeInTheDocument();
  });
});
