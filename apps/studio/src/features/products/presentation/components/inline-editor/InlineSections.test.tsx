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

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Droppable: ({
    children,
  }: {
    children: (p: {
      innerRef: () => null;
      droppableProps: Record<string, unknown>;
      placeholder: null;
    }) => React.ReactNode;
  }) =>
    children({ innerRef: () => null, droppableProps: {}, placeholder: null }),
  Draggable: ({
    children,
  }: {
    children: (p: {
      innerRef: () => null;
      draggableProps: Record<string, unknown>;
      dragHandleProps: Record<string, unknown>;
    }) => React.ReactNode;
  }) =>
    children({
      innerRef: () => null,
      draggableProps: {},
      dragHandleProps: {},
    }),
}));

vi.mock("./InlineAddButton", () => ({
  InlineAddButton: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button type="button" data-testid="add-section-btn" onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock("./SectionCard", () => ({
  SectionCard: ({
    sectionIndex,
    onRemove,
  }: {
    sectionIndex: number;
    onRemove: () => void;
  }) => (
    <div data-testid={`section-card-${sectionIndex}`}>
      <button data-testid={`remove-section-${sectionIndex}`} onClick={onRemove}>
        Remove
      </button>
    </div>
  ),
}));

import { InlineSections } from "./InlineSections";

const theme = {
  bg: "bg-mint",
  bgLight: "bg-mint/15",
  border: "border-mint",
  text: "text-mint",
  badgeBg: "bg-mint",
  rowEven: "bg-mint/5",
  rowOdd: "bg-mint/15",
  accent: "--mint",
};

function Wrapper({
  sections = [] as {
    name_en: string;
    name_es: string;
    type: string;
    sort_order: number;
    items: unknown[];
  }[],
}) {
  const methods = useForm({
    defaultValues: { sections },
  });

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InlineSections control={methods.control as any} theme={theme as any} />
    </FormProvider>
  );
}

describe("InlineSections", () => {
  it("renders the sections container", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("inline-sections")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<Wrapper />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("shows empty state when no sections", () => {
    render(<Wrapper />);
    expect(screen.getByText("emptySection")).toBeInTheDocument();
  });

  it("renders add section button", () => {
    render(<Wrapper />);
    expect(screen.getByTestId("add-section-btn")).toBeInTheDocument();
  });

  it("adds a section when add button is clicked", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId("add-section-btn"));
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
  });

  it("renders section cards when sections exist", () => {
    render(
      <Wrapper
        sections={[
          {
            name_en: "Details",
            name_es: "Detalles",
            type: "accordion",
            sort_order: 0,
            items: [],
          },
        ]}
      />,
    );
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
  });

  it("renders multiple section cards", () => {
    render(
      <Wrapper
        sections={[
          {
            name_en: "A",
            name_es: "A",
            type: "cards",
            sort_order: 0,
            items: [],
          },
          {
            name_en: "B",
            name_es: "B",
            type: "accordion",
            sort_order: 1,
            items: [],
          },
        ]}
      />,
    );
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-card-1")).toBeInTheDocument();
  });

  it("hides empty state when sections exist", () => {
    render(
      <Wrapper
        sections={[
          {
            name_en: "A",
            name_es: "",
            type: "cards",
            sort_order: 0,
            items: [],
          },
        ]}
      />,
    );
    expect(screen.queryByText("emptySection")).not.toBeInTheDocument();
  });

  it("removes a section when remove is clicked", () => {
    render(
      <Wrapper
        sections={[
          {
            name_en: "A",
            name_es: "",
            type: "cards",
            sort_order: 0,
            items: [],
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("remove-section-0"));
    expect(screen.queryByTestId("section-card-0")).not.toBeInTheDocument();
  });
});
