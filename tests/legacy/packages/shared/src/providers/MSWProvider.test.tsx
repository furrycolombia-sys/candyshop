import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

describe("MSWProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("renders children immediately when mocks are disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCKS", "false");
    const { MSWProvider } = await import("./MSWProvider");

    const mockGetWorker = vi.fn();
    render(
      <MSWProvider getWorker={mockGetWorker}>
        <div data-testid="child">Content</div>
      </MSWProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(mockGetWorker).not.toHaveBeenCalled();
  });
});
