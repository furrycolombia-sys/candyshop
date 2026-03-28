import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.time) return `${key}:${params.time}`;
    return key;
  },
}));

import { ExpirationLabel } from "./ExpirationLabel";

describe("ExpirationLabel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows remaining time in hours and minutes", () => {
    vi.useFakeTimers();
    // Set to a known time
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    // Expires in 2 hours 30 minutes
    const expiresAt = "2026-01-01T14:30:00Z";
    render(<ExpirationLabel expiresAt={expiresAt} />);

    expect(screen.getByText("expiresIn:2h 30m")).toBeInTheDocument();
  });

  it("shows only minutes when less than 1 hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    const expiresAt = "2026-01-01T12:45:00Z";
    render(<ExpirationLabel expiresAt={expiresAt} />);

    expect(screen.getByText("expiresIn:45m")).toBeInTheDocument();
  });

  it("shows expired when time has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T14:00:00Z"));

    const expiresAt = "2026-01-01T12:00:00Z";
    render(<ExpirationLabel expiresAt={expiresAt} />);

    expect(screen.getByText("expired")).toBeInTheDocument();
  });
});
