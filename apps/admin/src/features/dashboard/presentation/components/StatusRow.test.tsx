/* eslint-disable testing-library/no-node-access */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { StatusRow } from "./StatusRow";

describe("StatusRow", () => {
  it("renders the label", () => {
    render(
      <StatusRow label="Database" status="operational" statusLabel="Online" />,
    );
    expect(screen.getByText("Database")).toBeInTheDocument();
  });

  it("renders the status label", () => {
    render(
      <StatusRow label="Database" status="operational" statusLabel="Online" />,
    );
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders operational status dot", () => {
    const { container } = render(
      <StatusRow label="DB" status="operational" statusLabel="OK" />,
    );
    const dot = container.querySelector(".bg-success");
    expect(dot).toBeInTheDocument();
  });

  it("renders degraded status dot", () => {
    const { container } = render(
      <StatusRow label="DB" status="degraded" statusLabel="Slow" />,
    );
    const dot = container.querySelector(".bg-warning");
    expect(dot).toBeInTheDocument();
  });

  it("renders down status dot", () => {
    const { container } = render(
      <StatusRow label="DB" status="down" statusLabel="Offline" />,
    );
    const dot = container.querySelector(".bg-destructive");
    expect(dot).toBeInTheDocument();
  });
});
