/* eslint-disable testing-library/no-node-access */
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { FeaturedRibbon } from "@/features/products/presentation/components/FeaturedRibbon";

describe("FeaturedRibbon", () => {
  it("renders a canvas element", () => {
    const { container } = render(
      <FeaturedRibbon label="Featured" accentVar="--pink" />,
    );
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("has aria-hidden attribute for accessibility", () => {
    const { container } = render(
      <FeaturedRibbon label="New" accentVar="--mint" />,
    );
    expect(container.querySelector("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("applies sm size styling by default", () => {
    const { container } = render(
      <FeaturedRibbon label="Hot" accentVar="--pink" />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas?.style.width).toBe("160px");
    expect(canvas?.style.height).toBe("160px");
  });

  it("applies lg size styling", () => {
    const { container } = render(
      <FeaturedRibbon label="Hot" accentVar="--pink" size="lg" />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas?.style.width).toBe("200px");
    expect(canvas?.style.height).toBe("200px");
  });
});

describe("FeaturedRibbon canvas drawing", () => {
  let rafCallbacks: ((timestamp: number) => void)[];
  let cancelledFrames: number[];
  let mockCtx: Record<string, unknown>;

  beforeEach(() => {
    rafCallbacks = [];
    cancelledFrames = [];

    mockCtx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      clip: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 8 }),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
    };

    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      cancelledFrames.push(id);
    });

    // Override getContext on the prototype
    HTMLCanvasElement.prototype.getContext = (() => mockCtx) as never;

    vi.stubGlobal("getComputedStyle", () => ({
      getPropertyValue: () => "#e91e63",
    }));

    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve() },
      writable: true,
      configurable: true,
    });
  });

  it("sets up canvas context on mount", async () => {
    render(<FeaturedRibbon label="Featured" accentVar="--pink" />);
    await vi.waitFor(() => {
      expect(mockCtx.scale as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
  });

  it("schedules animation frame after fonts ready", async () => {
    render(<FeaturedRibbon label="Test" accentVar="--mint" />);
    await vi.waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });
  });

  it("executes draw function on animation frame", async () => {
    render(<FeaturedRibbon label="Hi" accentVar="--pink" />);
    await vi.waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });
    rafCallbacks.at(-1)!(100);
    expect(mockCtx.clearRect as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(mockCtx.beginPath as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(mockCtx.fill as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("draws shine sweep within animation cycle", async () => {
    render(<FeaturedRibbon label="Hi" accentVar="--pink" />);
    await vi.waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });
    rafCallbacks.at(-1)!(1000);
    expect(
      mockCtx.createLinearGradient as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalled();
  });

  it("auto-scales text when too wide", async () => {
    (mockCtx.measureText as ReturnType<typeof vi.fn>).mockReturnValue({
      width: 200,
    });
    render(<FeaturedRibbon label="Very Long Label" accentVar="--pink" />);
    await vi.waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });
    rafCallbacks.at(-1)!(0);
    expect(mockCtx.fillText as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("cancels animation frame on unmount", async () => {
    const { unmount } = render(
      <FeaturedRibbon label="Test" accentVar="--pink" />,
    );
    await vi.waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThan(0);
    });
    unmount();
    expect(cancelledFrames.length).toBeGreaterThan(0);
  });
});
