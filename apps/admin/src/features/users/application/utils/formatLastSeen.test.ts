import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { formatLastSeen } from "./formatLastSeen";

const NOW = new Date("2026-01-15T12:00:00.000Z").getTime();

function msAgo(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe("formatLastSeen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null input", () => {
    expect(formatLastSeen(null)).toBeNull();
  });

  it("returns justNow for timestamps within the last minute", () => {
    expect(formatLastSeen(msAgo(30_000))).toEqual({ key: "justNow" });
    expect(formatLastSeen(msAgo(59_000))).toEqual({ key: "justNow" });
  });

  it("returns minutesAgo for timestamps 1–59 minutes ago", () => {
    expect(formatLastSeen(msAgo(60_000))).toEqual({
      key: "minutesAgo",
      params: { count: 1 },
    });
    expect(formatLastSeen(msAgo(30 * 60_000))).toEqual({
      key: "minutesAgo",
      params: { count: 30 },
    });
    expect(formatLastSeen(msAgo(59 * 60_000))).toEqual({
      key: "minutesAgo",
      params: { count: 59 },
    });
  });

  it("returns hoursAgo for timestamps 1–23 hours ago", () => {
    expect(formatLastSeen(msAgo(60 * 60_000))).toEqual({
      key: "hoursAgo",
      params: { count: 1 },
    });
    expect(formatLastSeen(msAgo(12 * 60 * 60_000))).toEqual({
      key: "hoursAgo",
      params: { count: 12 },
    });
    expect(formatLastSeen(msAgo(23 * 60 * 60_000))).toEqual({
      key: "hoursAgo",
      params: { count: 23 },
    });
  });

  it("returns daysAgo for timestamps 1–29 days ago", () => {
    expect(formatLastSeen(msAgo(24 * 60 * 60_000))).toEqual({
      key: "daysAgo",
      params: { count: 1 },
    });
    expect(formatLastSeen(msAgo(15 * 24 * 60 * 60_000))).toEqual({
      key: "daysAgo",
      params: { count: 15 },
    });
  });

  it("returns monthsAgo for timestamps 1–11 months ago", () => {
    expect(formatLastSeen(msAgo(30 * 24 * 60 * 60_000))).toEqual({
      key: "monthsAgo",
      params: { count: 1 },
    });
    expect(formatLastSeen(msAgo(6 * 30 * 24 * 60 * 60_000))).toEqual({
      key: "monthsAgo",
      params: { count: 6 },
    });
  });

  it("returns yearsAgo for timestamps 1+ years ago", () => {
    expect(formatLastSeen(msAgo(365 * 24 * 60 * 60_000))).toEqual({
      key: "yearsAgo",
      params: { count: 1 },
    });
    expect(formatLastSeen(msAgo(2 * 365 * 24 * 60 * 60_000))).toEqual({
      key: "yearsAgo",
      params: { count: 2 },
    });
  });
});
