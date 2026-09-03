import { render, screen, fireEvent, act } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

// Capture onDragEnd so tests can invoke it directly
let capturedOnDragEnd: ((result: unknown) => void) | null = null;

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (result: unknown) => void;
  }) => {
    capturedOnDragEnd = onDragEnd;
    return <>{children}</>;
  },
  Droppable: ({
    children,
    droppableId,
  }: {
    children: (p: {
      innerRef: () => null;
      droppableProps: Record<string, unknown>;
      placeholder: null;
    }) => React.ReactNode;
    droppableId: string;
  }) =>
    children({
      innerRef: () => null,
      droppableProps: { "data-droppable-id": droppableId },
      placeholder: null,
    }),
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

vi.mock(
  "@/features/products/presentation/components/InlineEditor/InlineAddButton",
  () => ({
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
  }),
);

vi.mock(
  "@/features/products/presentation/components/InlineEditor/SectionCard",
  () => ({
    SectionCard: ({
      sectionIndex,
      onRemove,
      onToggleCollapse,
      isCollapsed,
    }: {
      sectionIndex: number;
      onRemove: () => void;
      onToggleCollapse: () => void;
      isCollapsed: boolean;
    }) => (
      <div
        data-testid={`section-card-${sectionIndex}`}
        data-collapsed={isCollapsed}
      >
        <button
          data-testid={`remove-section-${sectionIndex}`}
          onClick={onRemove}
        >
          Remove
        </button>
        <button
          data-testid={`toggle-section-${sectionIndex}`}
          onClick={onToggleCollapse}
        >
          Toggle
        </button>
      </div>
    ),
  }),
);

import { InlineSections } from "@/features/products/presentation/components/InlineEditor/InlineSections";

const theme = {
  bg: "var(--mint)",
  bgLight: "color-mix(in srgb, var(--mint) 15%, transparent)",
  border: "var(--mint)",
  text: "var(--mint)",
  badgeBg: "var(--mint)",
  rowEven: "color-mix(in srgb, var(--mint) 5%, transparent)",
  rowOdd: "color-mix(in srgb, var(--mint) 15%, transparent)",
  foreground: "var(--libra-text)",
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

  it("toggles collapse state when toggle button is clicked", () => {
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
    const card = screen.getByTestId("section-card-0");
    expect(card).toHaveAttribute("data-collapsed", "false");

    fireEvent.click(screen.getByTestId("toggle-section-0"));
    expect(card).toHaveAttribute("data-collapsed", "true");

    fireEvent.click(screen.getByTestId("toggle-section-0"));
    expect(card).toHaveAttribute("data-collapsed", "false");
  });

  it("handleDragEnd does nothing when destination is null", () => {
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
          {
            name_en: "B",
            name_es: "",
            type: "cards",
            sort_order: 1,
            items: [],
          },
        ]}
      />,
    );
    act(() => {
      capturedOnDragEnd?.({
        source: { droppableId: "sections", index: 0 },
        destination: null,
      });
    });
    // Both sections still present — no crash
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-card-1")).toBeInTheDocument();
  });

  it("handleDragEnd reorders sections on section-level drag", () => {
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
          {
            name_en: "B",
            name_es: "",
            type: "cards",
            sort_order: 1,
            items: [],
          },
        ]}
      />,
    );
    act(() => {
      capturedOnDragEnd?.({
        source: { droppableId: "sections", index: 0 },
        destination: { droppableId: "sections", index: 1 },
      });
    });
    // Both cards still present after reorder
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
    expect(screen.getByTestId("section-card-1")).toBeInTheDocument();
  });

  it("handleDragEnd triggers item move for item-level drag", () => {
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
    // Item drag within section 0 — no crash even without a registered moveFn
    act(() => {
      capturedOnDragEnd?.({
        source: { droppableId: "section-items-0", index: 0 },
        destination: { droppableId: "section-items-0", index: 1 },
      });
    });
    expect(screen.getByTestId("section-card-0")).toBeInTheDocument();
  });
});
