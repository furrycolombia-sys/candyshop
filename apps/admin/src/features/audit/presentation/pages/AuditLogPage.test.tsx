import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSetParams = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: () => [{ table: "", action: "", offset: 0 }, mockSetParams],
  };
});

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/audit/application/useAuditLog", () => ({
  useAuditLog: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

// Capture props so we can invoke callbacks
let capturedFilterProps: Record<string, unknown> = {};

vi.mock("@/features/audit/presentation/components/AuditFilters", () => ({
  AuditFilters: (props: Record<string, unknown>) => {
    capturedFilterProps = props;
    return <div data-testid="audit-filters-mock">Filters</div>;
  },
}));

vi.mock("@/features/audit/presentation/components/AuditTable", () => ({
  AuditTable: (props: Record<string, unknown>) => {
    return (
      <div data-testid="audit-table-mock">
        <button
          type="button"
          data-testid="load-more"
          onClick={() => (props.onLoadMore as () => void)?.()}
        >
          Load
        </button>
      </div>
    );
  },
}));

import { AuditLogPage } from "./AuditLogPage";

describe("AuditLogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFilterProps = {};
  });

  it("renders the page with title", () => {
    render(<AuditLogPage />);
    expect(screen.getByTestId("audit-title")).toHaveTextContent("title");
  });

  it("renders subtitle", () => {
    render(<AuditLogPage />);
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("renders AuditFilters component", () => {
    render(<AuditLogPage />);
    expect(screen.getByTestId("audit-filters-mock")).toBeInTheDocument();
  });

  it("renders AuditTable component", () => {
    render(<AuditLogPage />);
    expect(screen.getByTestId("audit-table-mock")).toBeInTheDocument();
  });

  it("renders the page root with test id", () => {
    render(<AuditLogPage />);
    expect(screen.getByTestId("audit-log-page")).toBeInTheDocument();
  });

  it("handleLoadMore increments offset via setParams", () => {
    render(<AuditLogPage />);
    fireEvent.click(screen.getByTestId("load-more"));
    expect(mockSetParams).toHaveBeenCalled();
  });

  it("onTableChange calls setParams with new table", () => {
    render(<AuditLogPage />);
    const onTableChange = capturedFilterProps.onTableChange as (
      v: string,
    ) => void;
    onTableChange("users");
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ table: "users", offset: 0 }),
    );
  });

  it("onActionChange calls setParams with new action", () => {
    render(<AuditLogPage />);
    const onActionChange = capturedFilterProps.onActionChange as (
      v: string,
    ) => void;
    onActionChange("INSERT");
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INSERT", offset: 0 }),
    );
  });
});
