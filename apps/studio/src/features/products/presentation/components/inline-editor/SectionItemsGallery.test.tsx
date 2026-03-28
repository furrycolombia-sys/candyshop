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

import { SectionItemsGallery } from "./SectionItemsGallery";

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

const sampleItem = {
  title_en: "Photo",
  title_es: "Foto",
  description_en: "",
  description_es: "",
  icon: "",
  image_url: "https://example.com/photo.jpg",
  sort_order: 0,
};

function Wrapper({ items = [] }: { items?: Array<typeof sampleItem> }) {
  const methods = useForm({
    defaultValues: {
      sections: [
        {
          name_en: "Gallery",
          name_es: "",
          type: "gallery",
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
      <SectionItemsGallery
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

describe("SectionItemsGallery", () => {
  it("shows empty state when no items", () => {
    render(<Wrapper />);
    expect(screen.getByText("emptySection")).toBeInTheDocument();
  });

  it("renders add item button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-add-btn")).toBeInTheDocument();
  });

  it("renders gallery items when provided", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-0-item-0")).toBeInTheDocument();
  });

  it("renders image URL input for each item", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-item-image-0-0")).toBeInTheDocument();
  });

  it("renders title input for each item", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(screen.getByTestId("section-item-title-0-0")).toBeInTheDocument();
  });

  it("renders language toggle", () => {
    render(<Wrapper items={[sampleItem]} />);
    expect(
      screen.getByTestId("section-item-lang-toggle-0-0"),
    ).toBeInTheDocument();
  });

  it("renders image when URL is provided", () => {
    render(<Wrapper items={[sampleItem]} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
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
