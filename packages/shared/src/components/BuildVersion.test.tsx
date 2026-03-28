import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { BuildVersion } from "./BuildVersion";

describe("BuildVersion", () => {
  const fullHash = "abc1234567890";

  it("renders the short hash (first 7 characters)", () => {
    render(<BuildVersion hash={fullHash} />);
    expect(screen.getByText("Build: abc1234")).toBeInTheDocument();
  });

  it("uses the full hash as the title attribute", () => {
    render(<BuildVersion hash={fullHash} />);
    expect(screen.getByTitle(fullHash)).toBeInTheDocument();
  });

  it("applies sidebar variant classes by default", () => {
    render(<BuildVersion hash={fullHash} />);
    const span = screen.getByTitle(fullHash);
    expect(span.className).toContain("text-center");
    expect(span.className).toContain("block");
  });

  it("applies footer variant classes when variant is footer", () => {
    render(<BuildVersion hash={fullHash} variant="footer" />);
    const span = screen.getByTitle(fullHash);
    expect(span.className).not.toContain("block");
    expect(span.className).toContain("font-mono");
  });

  it("uses custom formatLabel when provided", () => {
    const formatLabel = (shortHash: string) => `v${shortHash}`;
    render(<BuildVersion hash={fullHash} formatLabel={formatLabel} />);
    expect(screen.getByText("vabc1234")).toBeInTheDocument();
  });

  it("uses default label format when formatLabel is not provided", () => {
    render(<BuildVersion hash={fullHash} />);
    expect(screen.getByText("Build: abc1234")).toBeInTheDocument();
  });

  it("handles short hash input", () => {
    render(<BuildVersion hash="abc" />);
    expect(screen.getByText("Build: abc")).toBeInTheDocument();
  });
});
