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

import { SectionItemsTwoColumn } from "./SectionItemsTwoColumn";

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
  title_en: "Label",
  title_es: "Etiqueta",
  description_en: "Value",
  description_es: "Valor",
  icon: "",
  image_url: "",
  sort_order: 0,
};

function Wrapper({ items = [] }: { items?: Array<typeof sampleItem> }) {
  const methods = useForm({
    defaultValues: {
      sections: [
        {
          name_en: "Specs",
          name_es: "",
          type: "two-column",
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
      <SectionItemsTwoColumn
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

describe("SectionItemsTwoColumn", () => {
  it("shows empty state when no items", () => {
    render(<Wrapper />);
    expect(screen.getByText("emptySection")).toBeInTheDocument();
  });

  it("renders add item button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-add-btn")).toBeInTheDocument();
  });

  it("renders rows when items are provided", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
  });

  it("renders title (label) and description (value) columns", () => {
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

  it("renders multiple rows", () => {
    render(<Wrapper items={[sampleItem, { ...sampleItem, sort_order: 1 }]} />);
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-0-item-1")).toBeInTheDocument();
  });

  it("hides empty state when items exist", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.queryByText("emptySection")).not.toBeInTheDocument();
  });
});
