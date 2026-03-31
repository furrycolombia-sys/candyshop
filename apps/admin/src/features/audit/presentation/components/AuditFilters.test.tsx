/* eslint-disable testing-library/no-node-access */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/features/audit/application/useAuditLog", () => ({
  useAuditTableNames: () => ({
    data: ["users", "orders", "products"],
  }),
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return {
    ...actual,
    tid: (id: string) => ({ "data-testid": id }),
  };
});

import { AuditFilters } from "./AuditFilters";

describe("AuditFilters", () => {
  const defaultProps = {
    tableName: "",
    actionType: "",
    onTableChange: vi.fn(),
    onActionChange: vi.fn(),
  };

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
});
