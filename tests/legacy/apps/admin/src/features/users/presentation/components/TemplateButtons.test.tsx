import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { TemplateButtons } from "./TemplateButtons";

import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";

const defaultProps = {
  grantedKeys: [],
  onToggleTemplate: vi.fn(),
  onReset: vi.fn(),
  isPending: false,
  canManage: true,
};

describe("TemplateButtons", () => {
  it("renders all 4 template buttons plus reset", () => {
    render(<TemplateButtons {...defaultProps} />);
    expect(screen.getByTestId("template-btn-buyer")).toBeInTheDocument();
    expect(screen.getByTestId("template-btn-seller")).toBeInTheDocument();
    expect(screen.getByTestId("template-btn-admin")).toBeInTheDocument();
    expect(screen.getByTestId("template-btn-events")).toBeInTheDocument();
    expect(screen.getByTestId("template-btn-none")).toBeInTheDocument();
  });

  it("renders template label text", () => {
    render(<TemplateButtons {...defaultProps} />);
    expect(screen.getByText("t:templateBuyer")).toBeInTheDocument();
    expect(screen.getByText("t:templateSeller")).toBeInTheDocument();
    expect(screen.getByText("t:templateAdmin")).toBeInTheDocument();
    expect(screen.getByText("t:templateEvents")).toBeInTheDocument();
    expect(screen.getByText("t:templateNone")).toBeInTheDocument();
  });

  it("calls onToggleTemplate with key and true when inactive template clicked", () => {
    const onToggleTemplate = vi.fn();
    render(
      <TemplateButtons {...defaultProps} onToggleTemplate={onToggleTemplate} />,
    );
    fireEvent.click(screen.getByTestId("template-btn-buyer"));
    expect(onToggleTemplate).toHaveBeenCalledWith("buyer", true);
  });

  it("calls onToggleTemplate with false when active template clicked", () => {
    const onToggleTemplate = vi.fn();
    const grantedKeys = PERMISSION_TEMPLATES["buyer"];
    render(
      <TemplateButtons
        {...defaultProps}
        grantedKeys={grantedKeys}
        onToggleTemplate={onToggleTemplate}
      />,
    );
    fireEvent.click(screen.getByTestId("template-btn-buyer"));
    expect(onToggleTemplate).toHaveBeenCalledWith("buyer", false);
  });

  it("shows buyer button as active (default variant) when all buyer keys are granted", () => {
    const grantedKeys = PERMISSION_TEMPLATES["buyer"];
    render(<TemplateButtons {...defaultProps} grantedKeys={grantedKeys} />);
    const buyerBtn = screen.getByTestId("template-btn-buyer");
    expect(buyerBtn).toHaveAttribute("data-variant", "default");
  });

  it("shows buyer button as outline when not all buyer keys are granted", () => {
    render(<TemplateButtons {...defaultProps} grantedKeys={[]} />);
    const buyerBtn = screen.getByTestId("template-btn-buyer");
    expect(buyerBtn).toHaveAttribute("data-variant", "outline");
  });

  it("calls onReset when reset button is clicked", () => {
    const onReset = vi.fn();
    render(
      <TemplateButtons
        {...defaultProps}
        grantedKeys={["products.read"]}
        onReset={onReset}
      />,
    );
    fireEvent.click(screen.getByTestId("template-btn-none"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("disables reset button when grantedKeys is empty", () => {
    render(<TemplateButtons {...defaultProps} grantedKeys={[]} />);
    expect(screen.getByTestId("template-btn-none")).toBeDisabled();
  });

  it("disables reset button when canManage is false", () => {
    render(
      <TemplateButtons
        {...defaultProps}
        grantedKeys={["products.read"]}
        canManage={false}
      />,
    );
    expect(screen.getByTestId("template-btn-none")).toBeDisabled();
  });

  it("disables all buttons when isPending is true", () => {
    render(<TemplateButtons {...defaultProps} isPending={true} />);
    expect(screen.getByTestId("template-btn-buyer")).toBeDisabled();
    expect(screen.getByTestId("template-btn-seller")).toBeDisabled();
    expect(screen.getByTestId("template-btn-none")).toBeDisabled();
  });

  it("disables template buttons when canManage is false", () => {
    render(<TemplateButtons {...defaultProps} canManage={false} />);
    expect(screen.getByTestId("template-btn-buyer")).toBeDisabled();
    expect(screen.getByTestId("template-btn-seller")).toBeDisabled();
  });

  it("isTemplateActive returns false when only some keys are granted", () => {
    const partialBuyerKeys = PERMISSION_TEMPLATES["buyer"].slice(0, 2);
    render(
      <TemplateButtons {...defaultProps} grantedKeys={partialBuyerKeys} />,
    );
    const buyerBtn = screen.getByTestId("template-btn-buyer");
    expect(buyerBtn).toHaveAttribute("data-variant", "outline");
  });
});
