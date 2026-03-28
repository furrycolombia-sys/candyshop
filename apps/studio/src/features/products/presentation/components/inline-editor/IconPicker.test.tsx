import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("lucide-react/dynamic", () => ({
  DynamicIcon: ({ name }: { name: string }) => (
    <svg data-testid={`icon-${name}`} />
  ),
  iconNames: ["sparkles", "heart", "star", "home", "zap"],
}));

vi.mock("ui", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  PopoverContent: ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid={(rest as Record<string, string>)["data-testid"]}>
      {children}
    </div>
  ),
}));

import { IconPicker } from "./IconPicker";

describe("IconPicker", () => {
  const defaultProps = {
    value: "sparkles",
    onChange: vi.fn(),
    themeBg: "bg-mint",
  };

  it("renders the trigger button", () => {
    render(<IconPicker {...defaultProps} />);
    expect(screen.getByTestId("icon-picker-trigger")).toBeInTheDocument();
  });

  it("renders the current icon in the trigger", () => {
    render(<IconPicker {...defaultProps} />);
    // sparkles appears in both trigger and grid
    const icons = screen.getAllByTestId("icon-sparkles");
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders search input", () => {
    render(<IconPicker {...defaultProps} />);
    expect(screen.getByTestId("icon-picker-search")).toBeInTheDocument();
  });

  it("renders icon buttons in the grid", () => {
    render(<IconPicker {...defaultProps} />);
    expect(screen.getByTitle("sparkles")).toBeInTheDocument();
    expect(screen.getByTitle("heart")).toBeInTheDocument();
  });

  it("filters icons based on search", () => {
    render(<IconPicker {...defaultProps} />);
    fireEvent.change(screen.getByTestId("icon-picker-search"), {
      target: { value: "hea" },
    });
    expect(screen.getByTitle("heart")).toBeInTheDocument();
    expect(screen.queryByTitle("star")).not.toBeInTheDocument();
  });

  it("shows no results message when nothing matches", () => {
    render(<IconPicker {...defaultProps} />);
    fireEvent.change(screen.getByTestId("icon-picker-search"), {
      target: { value: "zzzzzzzzz" },
    });
    expect(screen.getByText("noIconsFound")).toBeInTheDocument();
  });

  it("calls onChange when an icon is selected", () => {
    const onChange = vi.fn();
    render(<IconPicker {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByTitle("heart"));
    expect(onChange).toHaveBeenCalledWith("heart");
  });

  it("defaults to sparkles when value is empty", () => {
    render(<IconPicker {...defaultProps} value="" />);
    const icons = screen.getAllByTestId("icon-sparkles");
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });
});
