import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/features/payment-methods/domain/youtubeEmbed", () => ({
  toYouTubeEmbedUrl: vi.fn(),
}));

import { VideoBlockEditor } from "@/features/payment-methods/presentation/components/VideoBlockEditor";

import { toYouTubeEmbedUrl } from "@/features/payment-methods/domain/youtubeEmbed";

const baseBlock = {
  id: "block-1",
  type: "video" as const,
  sort_order: 0,
  url: "https://www.youtube.com/embed/abc123",
};

describe("VideoBlockEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the URL input with the block's current url", () => {
    render(<VideoBlockEditor block={baseBlock} onChange={vi.fn()} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe(baseBlock.url);
  });

  it("clears error and emits empty url when input is cleared", () => {
    const onChange = vi.fn();
    render(<VideoBlockEditor block={baseBlock} onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });

    expect(onChange).toHaveBeenCalledWith({ ...baseBlock, url: "" });
    expect(screen.queryByTestId("video-url-error")).not.toBeInTheDocument();
  });

  it("emits embed url and clears error when valid YouTube URL is entered", () => {
    vi.mocked(toYouTubeEmbedUrl).mockReturnValue(
      "https://www.youtube.com/embed/xyz789",
    );
    const onChange = vi.fn();
    render(<VideoBlockEditor block={baseBlock} onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "https://youtu.be/xyz789" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...baseBlock,
      url: "https://www.youtube.com/embed/xyz789",
    });
    expect(screen.queryByTestId("video-url-error")).not.toBeInTheDocument();
  });

  it("shows error message and does not emit when URL is invalid", () => {
    vi.mocked(toYouTubeEmbedUrl).mockReturnValue(null);
    const onChange = vi.fn();
    render(<VideoBlockEditor block={baseBlock} onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "https://vimeo.com/123" },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("invalidYoutubeUrl")).toBeInTheDocument();
  });
});
