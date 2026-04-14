import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import {
  StatusCard,
  StatusCardHeader,
  StatusCardIcon,
  StatusCardContent,
  StatusCardTitle,
  StatusCardDescription,
  StatusCardActions,
} from "./status-card";

describe("StatusCard", () => {
  it("renders children", () => {
    render(<StatusCard>Card content</StatusCard>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies default variant class", () => {
    render(<StatusCard>Default</StatusCard>);
    expect(screen.getByText("Default").className).toContain("bg-card");
  });

  it("applies success variant class", () => {
    render(<StatusCard variant="success">OK</StatusCard>);
    expect(screen.getByText("OK").className).toContain("surface-success");
  });

  it("applies warning variant class", () => {
    render(<StatusCard variant="warning">Warn</StatusCard>);
    expect(screen.getByText("Warn").className).toContain("surface-warning");
  });

  it("applies destructive variant class", () => {
    render(<StatusCard variant="destructive">Error</StatusCard>);
    expect(screen.getByText("Error").className).toContain(
      "surface-destructive",
    );
  });

  it("applies info variant class", () => {
    render(<StatusCard variant="info">Note</StatusCard>);
    expect(screen.getByText("Note").className).toContain("surface-info");
  });

  it("applies custom className", () => {
    render(<StatusCard className="extra">Test</StatusCard>);
    expect(screen.getByText("Test").className).toContain("extra");
  });
});

describe("StatusCard sub-components", () => {
  it("renders StatusCardHeader", () => {
    render(<StatusCardHeader>Header</StatusCardHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("renders StatusCardIcon", () => {
    render(<StatusCardIcon data-testid="icon">Icon</StatusCardIcon>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders StatusCardContent", () => {
    render(<StatusCardContent>Content</StatusCardContent>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders StatusCardTitle as h3", () => {
    render(<StatusCardTitle>Title</StatusCardTitle>);
    const el = screen.getByText("Title");
    expect(el.tagName).toBe("H3");
  });

  it("renders StatusCardDescription as p", () => {
    render(<StatusCardDescription>Desc</StatusCardDescription>);
    const el = screen.getByText("Desc");
    expect(el.tagName).toBe("P");
  });

  it("renders StatusCardActions", () => {
    render(<StatusCardActions>Actions</StatusCardActions>);
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("composes all sub-components together", () => {
    render(
      <StatusCard variant="success">
        <StatusCardHeader>
          <StatusCardIcon>Icon</StatusCardIcon>
          <StatusCardContent>
            <StatusCardTitle>All Good</StatusCardTitle>
            <StatusCardDescription>Things are fine</StatusCardDescription>
          </StatusCardContent>
          <StatusCardActions>
            <button type="button">Action</button>
          </StatusCardActions>
        </StatusCardHeader>
      </StatusCard>,
    );
    expect(screen.getByText("All Good")).toBeInTheDocument();
    expect(screen.getByText("Things are fine")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });
});
