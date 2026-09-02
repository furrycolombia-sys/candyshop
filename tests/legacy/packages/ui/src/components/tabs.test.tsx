import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

describe("Tabs", () => {
  function renderTabs() {
    return render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );
  }

  it("renders tab triggers", () => {
    renderTabs();
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
  });

  it("shows content for default tab", () => {
    renderTabs();
    expect(screen.getByText("Content 1")).toBeInTheDocument();
  });

  it("renders inactive tab content as hidden", () => {
    const { container } = renderTabs();
    // Radix Tabs renders inactive content with hidden attribute and data-state=inactive
    const hiddenPanels = container.querySelectorAll(
      "[data-slot='tabs-content'][data-state='inactive']",
    );
    expect(hiddenPanels).toHaveLength(1);
    expect(hiddenPanels[0]).toHaveAttribute("hidden");
  });

  it("applies data-slot attributes", () => {
    const { container } = renderTabs();
    expect(container.querySelector("[data-slot='tabs']")).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='tabs-list']"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='tabs-trigger']"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='tabs-content']"),
    ).toBeInTheDocument();
  });

  it("applies custom className to Tabs root", () => {
    const { container } = render(
      <Tabs defaultValue="a" className="my-tabs">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
      </Tabs>,
    );
    expect(container.querySelector("[data-slot='tabs']")?.className).toContain(
      "my-tabs",
    );
  });

  it("renders folder variant on TabsList", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList variant="folder">
          <TabsTrigger value="a" variant="folder">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content</TabsContent>
      </Tabs>,
    );
    const list = container.querySelector("[data-slot='tabs-list']");
    expect(list).toHaveAttribute("data-variant", "folder");
  });
});
