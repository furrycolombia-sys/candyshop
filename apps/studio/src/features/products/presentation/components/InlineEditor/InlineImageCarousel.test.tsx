import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  getCategoryTheme: () => ({
    bg: "var(--mint)",
    bgLight: "color-mix(in srgb, var(--mint) 15%, transparent)",
    border: "var(--mint)",
    text: "var(--mint)",
    badgeBg: "var(--mint)",
    rowEven: "color-mix(in srgb, var(--mint) 5%, transparent)",
    rowOdd: "color-mix(in srgb, var(--mint) 15%, transparent)",
    foreground: "var(--foreground)",
    accent: "--mint",
  }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
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
    children: (
      p: {
        innerRef: () => null;
        draggableProps: Record<string, unknown>;
        dragHandleProps: Record<string, unknown>;
      },
      s: { isDragging: boolean },
    ) => React.ReactNode;
  }) =>
    children(
      { innerRef: () => null, draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));

import { InlineImageCarousel } from "./InlineImageCarousel";

function Wrapper({
  images = [] as {
    url: string;
    alt: string;
    sort_order?: number;
    is_cover?: boolean;
  }[],
}) {
  const methods = useForm({
    defaultValues: { images, category: "merch" },
  });

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InlineImageCarousel control={methods.control as any} />
    </FormProvider>
  );
}

describe("InlineImageCarousel", () => {
  it("renders empty state when no images", () => {
    render(<Wrapper />);
    expect(
      screen.getAllByTestId("image-gallery-main-empty")[0],
    ).toBeInTheDocument();
  });

  it("renders add thumbnail button", () => {
    render(<Wrapper />);
    expect(screen.getAllByTestId("image-thumb-add")[0]).toBeInTheDocument();
  });

  it("adds an image when add button is clicked", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getAllByTestId("image-thumb-add")[0]);
    // After adding, the main image should appear
    expect(screen.getAllByTestId("image-gallery-main")[0]).toBeInTheDocument();
  });

  it("renders images when provided", () => {
    render(
      <Wrapper
        images={[
          { url: "https://example.com/img1.jpg", alt: "Image 1" },
          { url: "https://example.com/img2.jpg", alt: "Image 2" },
        ]}
      />,
    );
    expect(screen.getAllByTestId("image-gallery-main")[0]).toBeInTheDocument();
    expect(
      screen.getAllByTestId("image-gallery-thumbs")[0],
    ).toBeInTheDocument();
  });

  it("shows edit bar when image is selected", () => {
    render(
      <Wrapper images={[{ url: "https://example.com/img.jpg", alt: "Img" }]} />,
    );
    expect(screen.getAllByTestId("image-edit-bar")[0]).toBeInTheDocument();
  });

  it("renders set-as-cover buttons on each thumbnail", () => {
    render(
      <Wrapper
        images={[
          {
            url: "https://example.com/img1.jpg",
            alt: "Image 1",
            sort_order: 0,
          },
          {
            url: "https://example.com/img2.jpg",
            alt: "Image 2",
            sort_order: 1,
          },
        ]}
      />,
    );
    expect(screen.getAllByTestId("image-thumb-cover-0")[0]).toBeInTheDocument();
    expect(screen.getAllByTestId("image-thumb-cover-1")[0]).toBeInTheDocument();
  });

  it("clicking set-as-cover updates the cover image", () => {
    render(
      <Wrapper
        images={[
          {
            url: "https://example.com/img1.jpg",
            alt: "Image 1",
            sort_order: 0,
            is_cover: true,
          },
          {
            url: "https://example.com/img2.jpg",
            alt: "Image 2",
            sort_order: 1,
            is_cover: false,
          },
        ]}
      />,
    );

    // Click "Set as cover" on the second image
    const coverBtn = screen.getAllByTestId("image-thumb-cover-1")[0];
    fireEvent.click(coverBtn);

    // After clicking, the second image's cover button should reflect filled state
    const coverButtons = screen.getAllByLabelText("setAsCover");
    // The second thumbnail's button (desktop) should now be cover
    expect(coverButtons[1]).toHaveAttribute("data-cover", "true");
  });

  it("shows filled star on the cover image and unfilled on others", () => {
    render(
      <Wrapper
        images={[
          {
            url: "https://example.com/img1.jpg",
            alt: "Image 1",
            sort_order: 0,
            is_cover: false,
          },
          {
            url: "https://example.com/img2.jpg",
            alt: "Image 2",
            sort_order: 1,
            is_cover: true,
          },
        ]}
      />,
    );

    const coverButtons = screen.getAllByLabelText("setAsCover");
    // Desktop thumbnails come first, then mobile thumbnails
    // First desktop thumbnail (index 0) — not cover
    expect(coverButtons[0]).toHaveAttribute("data-cover", "false");

    // Second desktop thumbnail (index 1) — is cover
    expect(coverButtons[1]).toHaveAttribute("data-cover", "true");
  });
});
