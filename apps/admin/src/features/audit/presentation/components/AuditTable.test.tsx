/* eslint-disable testing-library/no-node-access */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values) return `${key}:${JSON.stringify(values)}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/domain/constants", () => ({
  AUDIT_ACTION_COLORS: {
    INSERT: "bg-mint text-mint",
    UPDATE: "bg-sky text-sky",
    DELETE: "bg-peach text-peach",
  },
}));

vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { auth: "https://auth.local" },
}));

// Mock the AuditRowDetail to keep tests focused
vi.mock("./AuditRowDetail", () => ({
  AuditRowDetail: ({ entry }: { entry: { event_id: number } }) => (
    <div data-testid={`detail-${entry.event_id}`}>Detail</div>
  ),
}));

import { AuditTable } from "./AuditTable";

import type { AuditEntry } from "@/features/audit/domain/types";

const makeEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  event_id: 1,
  schema_name: "public",
  table_name: "users",
  user_id: "uid-123",
  user_email: "test@example.com",
  user_display_name: "Test User",
  user_avatar: null,
  db_user: "postgres",
  action_type: "INSERT",
  row_data: { name_en: "Widget" },
  changed_fields: null,
  action_timestamp: "2025-06-15T10:30:00Z",
  transaction_id: 100,
  client_ip: null,
  ...overrides,
});

describe("AuditTable", () => {
  const defaultProps = {
    entries: [] as AuditEntry[],
    isLoading: false,
    isError: false,
    hasMore: false,
    onLoadMore: vi.fn(),
  };

  it("shows loading state when loading with no entries", () => {
    render(<AuditTable {...defaultProps} isLoading={true} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<AuditTable {...defaultProps} isError={true} />);
    expect(screen.getByTestId("audit-error")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    render(<AuditTable {...defaultProps} />);
    expect(screen.getByTestId("audit-empty")).toBeInTheDocument();
    expect(screen.getByText("noResults")).toBeInTheDocument();
  });

  it("renders entries in a table", () => {
    const entries = [makeEntry({ event_id: 1 }), makeEntry({ event_id: 2 })];
    render(<AuditTable {...defaultProps} entries={entries} />);

    expect(screen.getByTestId("audit-table")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-2")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<AuditTable {...defaultProps} entries={[makeEntry()]} />);
    expect(screen.getByText("timestamp")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
    expect(screen.getByText("tableName")).toBeInTheDocument();
    expect(screen.getByText("action")).toBeInTheDocument();
    expect(screen.getByText("summary")).toBeInTheDocument();
  });

  it("shows load more button when hasMore is true", () => {
    render(
      <AuditTable {...defaultProps} entries={[makeEntry()]} hasMore={true} />,
    );
    expect(screen.getByTestId("audit-load-more")).toBeInTheDocument();
  });

  it("hides load more button when hasMore is false", () => {
    render(
      <AuditTable {...defaultProps} entries={[makeEntry()]} hasMore={false} />,
    );
    expect(screen.queryByTestId("audit-load-more")).not.toBeInTheDocument();
  });

  it("calls onLoadMore when load more button is clicked", () => {
    const onLoadMore = vi.fn();
    render(
      <AuditTable
        {...defaultProps}
        entries={[makeEntry()]}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    fireEvent.click(screen.getByTestId("audit-load-more"));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("expands detail when a row is clicked", () => {
    render(
      <AuditTable {...defaultProps} entries={[makeEntry({ event_id: 42 })]} />,
    );

    // Detail should not be visible initially
    expect(screen.queryByTestId("detail-42")).not.toBeInTheDocument();

    // Click the row
    const row = screen.getByTestId("audit-row-42");
    fireEvent.click(row.querySelector("[role='button']")!);

    // Detail should now be visible
    expect(screen.getByTestId("detail-42")).toBeInTheDocument();
  });

  it("collapses detail when clicking the same row again", () => {
    render(
      <AuditTable {...defaultProps} entries={[makeEntry({ event_id: 42 })]} />,
    );

    const button = screen
      .getByTestId("audit-row-42")
      .querySelector("[role='button']")!;

    // Expand
    fireEvent.click(button);
    expect(screen.getByTestId("detail-42")).toBeInTheDocument();

    // Collapse
    fireEvent.click(button);
    expect(screen.queryByTestId("detail-42")).not.toBeInTheDocument();
  });

  it("shows user display name as link when user_id exists", () => {
    render(<AuditTable {...defaultProps} entries={[makeEntry()]} />);
    const link = screen.getByText("Test User");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://auth.local/en/profile/uid-123",
    );
  });

  it("shows db_user when user_id is null", () => {
    const entry = makeEntry({ user_id: null, user_display_name: null });
    render(<AuditTable {...defaultProps} entries={[entry]} />);
    expect(screen.getByText("postgres")).toBeInTheDocument();
  });

  it("shows INSERT summary with name", () => {
    const entry = makeEntry({
      action_type: "INSERT",
      row_data: { name_en: "Widget" },
    });
    render(<AuditTable {...defaultProps} entries={[entry]} />);
    // Should contain summaryNew key with name value
    expect(screen.getByText(/summaryNew/)).toBeInTheDocument();
  });

  it("shows UPDATE summary with field names for few fields", () => {
    const entry = makeEntry({
      action_type: "UPDATE",
      changed_fields: { name: "New", email: "new@test.com" },
    });
    render(<AuditTable {...defaultProps} entries={[entry]} />);
    expect(screen.getByText("name, email")).toBeInTheDocument();
  });

  it("expands row on Enter key", () => {
    render(
      <AuditTable {...defaultProps} entries={[makeEntry({ event_id: 42 })]} />,
    );
    const button = screen
      .getByTestId("audit-row-42")
      .querySelector("[role='button']")!;
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.getByTestId("detail-42")).toBeInTheDocument();
  });

  it("expands row on Space key", () => {
    render(
      <AuditTable {...defaultProps} entries={[makeEntry({ event_id: 42 })]} />,
    );
    const button = screen
      .getByTestId("audit-row-42")
      .querySelector("[role='button']")!;
    fireEvent.keyDown(button, { key: " " });
    expect(screen.getByTestId("detail-42")).toBeInTheDocument();
  });

  it("user link click stops propagation", () => {
    render(<AuditTable {...defaultProps} entries={[makeEntry()]} />);
    const link = screen.getByText("Test User").closest("a")!;
    const event = new MouseEvent("click", { bubbles: true });
    const stopProp = vi.spyOn(event, "stopPropagation");
    link.dispatchEvent(event);
    expect(stopProp).toHaveBeenCalled();
  });
});
