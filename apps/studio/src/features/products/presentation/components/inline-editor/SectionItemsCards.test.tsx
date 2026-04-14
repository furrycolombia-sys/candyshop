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
  InlineAddButton: ({ label }: { label: string }) => (
    <button type="button" data-testid="inline-add-btn">
      {label}
    </button>
  ),
}));

vi.mock("./InlineRemoveButton", () => ({
  InlineRemoveButton: () => (
    <button type="button" data-testid="inline-remove-btn" />
  ),
}));

vi.mock("./IconPicker", () => ({
  IconPicker: () => <div data-testid="icon-picker" />,
}));

import { SectionItemsCards } from "./SectionItemsCards";

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

const sampleItem = {
  title_en: "Feature",
  title_es: "Caracteristica",
  description_en: "Description",
  description_es: "Descripcion",
  icon: "sparkles",
  image_url: "",
  sort_order: 0,
};

function Wrapper({ items = [] }: { items?: Array<typeof sampleItem> }) {
  const methods = useForm({
    defaultValues: {
      sections: [
        {
          name_en: "Section",
          name_es: "",
          type: "cards",
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
      <SectionItemsCards
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

describe("SectionItemsCards", () => {
  it("shows empty state when no items", () => {
    render(<Wrapper />);
    expect(screen.getByText("emptySection")).toBeInTheDocument();
  });

  it("renders add item button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-add-btn")).toBeInTheDocument();
  });

  it("renders card items when provided", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
  });

  it("renders icon picker for each card", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("icon-picker")).toBeInTheDocument();
  });

  it("renders title and description textareas", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-item-title-0-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-item-desc-0-0")).toBeInTheDocument();
  });

  it("renders language toggle", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(
      screen.getByTestId("section-item-lang-toggle-0-0"),
    ).toBeInTheDocument();
  });

  it("renders multiple items", () => {
    render(<Wrapper items={[sampleItem, { ...sampleItem, sort_order: 1 }]} />);
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-0-item-1")).toBeInTheDocument();
  });

  it("hides empty state when items exist", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.queryByText("emptySection")).not.toBeInTheDocument();
  });
});
