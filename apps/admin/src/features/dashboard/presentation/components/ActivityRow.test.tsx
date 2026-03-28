import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/domain/constants", () => ({
  AUDIT_ACTION_COLORS: {
    INSERT: "bg-mint text-mint",
    UPDATE: "bg-sky text-sky",
    DELETE: "bg-peach text-peach",
  },
}));

import { ActivityRow } from "./ActivityRow";

describe("ActivityRow", () => {
  const defaultProps = {
    action: "INSERT" as const,
    table: "users",
    time: "Jan 1, 10:00 AM",
    user: "John Doe",
  };

  it("renders the action badge", () => {
    render(<ActivityRow {...defaultProps} />);
    expect(screen.getByText("INSERT")).toBeInTheDocument();
  });

  it("renders the table name", () => {
    render(<ActivityRow {...defaultProps} />);
    expect(screen.getByText("users")).toBeInTheDocument();
  });

  it("renders the user name", () => {
    render(<ActivityRow {...defaultProps} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders the time", () => {
    render(<ActivityRow {...defaultProps} />);
    expect(screen.getByText("Jan 1, 10:00 AM")).toBeInTheDocument();
  });

  it("renders UPDATE action", () => {
    render(<ActivityRow {...defaultProps} action="UPDATE" />);
    expect(screen.getByText("UPDATE")).toBeInTheDocument();
  });

  it("renders DELETE action", () => {
    render(<ActivityRow {...defaultProps} action="DELETE" />);
    expect(screen.getByText("DELETE")).toBeInTheDocument();
  });
});
