import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders without crashing", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has data-slot attribute", () => {
    render(<Button>Btn</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button");
  });

  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders default variant with data-variant attribute", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-variant",
      "default",
    );
  });

  it("renders destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "destructive");
    expect(btn.className).toContain("bg-destructive");
  });

  it("renders outline variant", () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "outline");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "ghost");
  });

  it("renders default size with data-size attribute", () => {
    render(<Button>Sized</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "default");
  });

  it("renders sm size", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");
  });

  it("renders lg size", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "lg");
  });

  it("renders icon size", () => {
    render(<Button size="icon">X</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "icon");
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole("button").className).toContain("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
