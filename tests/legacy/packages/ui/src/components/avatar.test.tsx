import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Avatar, AvatarFallback } from "./avatar";

describe("Avatar", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector("[data-slot='avatar']")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Avatar className="size-12" />);
    const el = container.querySelector("[data-slot='avatar']");
    expect(el?.className).toContain("size-12");
  });

  it("renders as a span element", () => {
    const { container } = render(<Avatar />);
    const el = container.querySelector("[data-slot='avatar']");
    expect(el?.tagName).toBe("SPAN");
  });
});

describe("AvatarFallback", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const el = container.querySelector("[data-slot='avatar-fallback']");
    expect(el).toBeInTheDocument();
  });

  it("renders fallback text", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const el = container.querySelector("[data-slot='avatar-fallback']");
    expect(el?.textContent).toBe("AB");
  });

  it("applies custom className", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback className="bg-red">X</AvatarFallback>
      </Avatar>,
    );
    const el = container.querySelector("[data-slot='avatar-fallback']");
    expect(el?.className).toContain("bg-red");
  });
});
