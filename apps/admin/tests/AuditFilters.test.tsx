/* eslint-disable testing-library/no-node-access */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUseAuditTableNames = vi.fn(() => ({
  data: ["users", "orders", "products"],
}));

vi.mock("@/features/audit/application/hooks/useAuditLog", () => ({
  useAuditTableNames: () => mockUseAuditTableNames(),
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return {
    ...actual,
    tid: (id: string) => ({ "data-testid": id }),
  };
});

import { AuditFilters } from "@/features/audit/presentation/components/AuditFilters";

describe("AuditFilters", () => {
  const defaultProps = {
    tableName: "",
    actionType: "",
    onTableChange: vi.fn(),
    onActionChange: vi.fn(),
  };

  it("renders only the 'allTables' option when tableNames is undefined", () => {
    mockUseAuditTableNames.mockReturnValueOnce({
      data: undefined as unknown as string[],
    });
    render(<AuditFilters {...defaultProps} />);

    const select = screen.getByTestId("audit-filter-table");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("allTables");
  });

  it("renders the table dropdown with options", () => {
    render(<AuditFilters {...defaultProps} />);

    const select = screen.getByTestId("audit-filter-table");
    expect(select).toBeInTheDocument();

    // Check options: "allTables" + 3 table names
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("allTables");
    expect(options[1]).toHaveTextContent("users");
    expect(options[2]).toHaveTextContent("orders");
    expect(options[3]).toHaveTextContent("products");
  });

  it("renders action type filter pills", () => {
    render(<AuditFilters {...defaultProps} />);

    expect(screen.getByTestId("audit-filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-insert")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-update")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-delete")).toBeInTheDocument();
  });

  it("calls onTableChange when table select changes", () => {
    const onTableChange = vi.fn();
    render(<AuditFilters {...defaultProps} onTableChange={onTableChange} />);

    fireEvent.change(screen.getByTestId("audit-filter-table"), {
      target: { value: "orders" },
    });

    expect(onTableChange).toHaveBeenCalledWith("orders");
  });

  it("calls onActionChange when action pill is clicked", () => {
    const onActionChange = vi.fn();
    render(<AuditFilters {...defaultProps} onActionChange={onActionChange} />);

    fireEvent.click(screen.getByTestId("audit-filter-insert"));
    expect(onActionChange).toHaveBeenCalledWith("INSERT");
  });

  it("calls onActionChange with empty string for 'all' pill", () => {
    const onActionChange = vi.fn();
    render(
      <AuditFilters
        {...defaultProps}
        actionType="INSERT"
        onActionChange={onActionChange}
      />,
    );

    fireEvent.click(screen.getByTestId("audit-filter-all"));
    expect(onActionChange).toHaveBeenCalledWith("");
  });

  // Which pill is active was expressed only through a CSS class, so nothing
  // outside the component could see it. An e2e test that filtered had no way
  // to know the filter had applied and slept instead, which the project's own
  // e2e-selectors rule exists to prevent.
  it("marks the active action pill with aria-pressed", () => {
    render(<AuditFilters {...defaultProps} actionType="INSERT" />);

    expect(screen.getByTestId("audit-filter-insert")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("audit-filter-update")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("audit-filter-all")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks the 'all' pill as pressed when no action type is selected", () => {
    render(<AuditFilters {...defaultProps} actionType="" />);

    expect(screen.getByTestId("audit-filter-all")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("audit-filter-insert")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
