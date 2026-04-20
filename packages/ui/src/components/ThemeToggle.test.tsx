import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ThemeToggle } from "./ThemeToggle";

const TEST_ID = "theme-toggle";

describe("ThemeToggle", () => {
  const defaultProps = {
    effectiveTheme: "light" as const,
    onToggle: vi.fn(),
    mounted: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the toggle button when mounted", () => {
    render(<ThemeToggle {...defaultProps} />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders disabled state when not mounted", () => {
    render(<ThemeToggle {...defaultProps} mounted={false} />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).toBeDisabled();
  });

  it("has accessible aria-label", () => {
    render(<ThemeToggle {...defaultProps} ariaLabel="Switch to dark mode" />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
  });

  it("uses default aria-label when not provided", () => {
    render(<ThemeToggle {...defaultProps} />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).toHaveAttribute("aria-label", "Toggle theme");
  });

  it("uses disabledAriaLabel when not mounted", () => {
    render(
      <ThemeToggle
        {...defaultProps}
        mounted={false}
        disabledAriaLabel="Loading theme"
      />,
    );

    const button = screen.getByTestId(TEST_ID);
    expect(button).toHaveAttribute("aria-label", "Loading theme");
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle {...defaultProps} onToggle={onToggle} />);

    const button = screen.getByTestId(TEST_ID);
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not call onToggle when disabled", () => {
    const onToggle = vi.fn();
    render(
      <ThemeToggle {...defaultProps} mounted={false} onToggle={onToggle} />,
    );

    const button = screen.getByTestId(TEST_ID);
    fireEvent.click(button);

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("shows icon when theme is light", () => {
    render(<ThemeToggle {...defaultProps} effectiveTheme="light" />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).not.toBeEmptyDOMElement();
  });

  it("shows icon when theme is dark", () => {
    render(<ThemeToggle {...defaultProps} effectiveTheme="dark" />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).not.toBeEmptyDOMElement();
  });

  it("shows icon when not mounted (loading state)", () => {
    render(<ThemeToggle {...defaultProps} mounted={false} />);

    const button = screen.getByTestId(TEST_ID);
    expect(button).not.toBeEmptyDOMElement();
  });

  it("uses custom testId when provided", () => {
    render(<ThemeToggle {...defaultProps} testId="custom-toggle" />);

    const button = screen.getByTestId("custom-toggle");
    expect(button).toBeInTheDocument();
  });
});
