import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { auth: "https://auth.local" },
}));

import { AuditRowDetail } from "./AuditRowDetail";

import type { AuditEntry } from "@/features/audit/domain/types";

const baseEntry: AuditEntry = {
  event_id: 1,
  schema_name: "public",
  table_name: "users",
  user_id: "abc-123",
  user_email: "john@example.com",
  user_display_name: "John Doe",
  user_avatar: "https://example.com/avatar.png",
  db_user: "postgres",
  action_type: "INSERT",
  row_data: { id: 1, name: "Test" },
  changed_fields: null,
  action_timestamp: "2025-01-01T00:00:00Z",
  transaction_id: 999,
  // eslint-disable-next-line sonarjs/no-hardcoded-ip -- test fixture data
  client_ip: "192.168.1.1",
};

describe("AuditRowDetail", () => {
  it("renders transaction id", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    expect(screen.getByText(/999/)).toBeInTheDocument();
  });

  it("renders user display name with profile link", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    const link = screen.getByText("John Doe");
    expect(link).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- closest() needed to traverse to anchor wrapper
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://auth.local/en/profile/abc-123",
    );
  });

  it("renders email in parentheses when both display name and email exist", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    expect(screen.getByText("(john@example.com)")).toBeInTheDocument();
  });

  it("renders client IP when present", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument();
  });

  it("hides client IP when null", () => {
    const entry = { ...baseEntry, client_ip: null };
    render(<AuditRowDetail entry={entry} />);
    expect(screen.queryByText(/ip/)).not.toBeInTheDocument();
  });

  it("renders changed fields table for UPDATE actions", () => {
    const entry: AuditEntry = {
      ...baseEntry,
      action_type: "UPDATE",
      changed_fields: { name: "New Name", email: "new@example.com" },
    };
    render(<AuditRowDetail entry={entry} />);

    expect(screen.getByText("changedFields")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("New Name")).toBeInTheDocument();
  });

  it("does not render changed fields for INSERT actions", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    expect(screen.queryByText("changedFields")).not.toBeInTheDocument();
  });

  it("renders full record in a details element", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    expect(screen.getByText("fullRecord")).toBeInTheDocument();
  });

  it("renders copy user id button when user_id exists", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    expect(screen.getByTestId("audit-copy-user-id")).toBeInTheDocument();
  });

  it("hides copy button when user_id is null", () => {
    const entry = { ...baseEntry, user_id: null };
    render(<AuditRowDetail entry={entry} />);
    expect(screen.queryByTestId("audit-copy-user-id")).not.toBeInTheDocument();
  });

  it("renders avatar image when user_avatar is set", () => {
    render(<AuditRowDetail entry={baseEntry} />);
    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("falls back to user_email when no display name", () => {
    const entry = { ...baseEntry, user_display_name: null };
    render(<AuditRowDetail entry={entry} />);
    const link = screen.getByText("john@example.com");
    // eslint-disable-next-line testing-library/no-node-access -- closest() needed to traverse to anchor wrapper
    expect(link.closest("a")).toBeInTheDocument();
  });

  it("copies user id to clipboard when copy button is clicked", async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- TS strict requires the argument
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<AuditRowDetail entry={baseEntry} />);
    fireEvent.click(screen.getByTestId("audit-copy-user-id"));
    expect(writeText).toHaveBeenCalledWith("abc-123");
  });
});
