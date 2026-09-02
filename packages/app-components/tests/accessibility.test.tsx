/**
 * Runtime accessibility coverage for the shared app-level components.
 *
 * These are the states every app shows when something is loading, empty or
 * broken -- precisely the moments a user is most likely to be confused, and
 * the ones least likely to be exercised by hand.
 */
import { render } from "@testing-library/react";
import type { AxeResults } from "axe-core";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// These components read copy through next-intl. The other test files in this
// package stub it the same way; a real provider would only add a second thing
// that can fail without telling us anything about accessibility.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `translated:${key}`,
}));

import { EmptyState } from "@app-components/components/EmptyState";
import { ErrorIndicator } from "@app-components/components/ErrorIndicator";
import { ErrorState } from "@app-components/components/ErrorState";
import { LoadingState } from "@app-components/components/LoadingState";

async function expectNoViolations(ui: ReactElement) {
  const { container } = render(ui);
  const results = (await axe(container)) as AxeResults;

  // Report rule ids rather than a bare boolean, so a failure names the rule.
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

describe("shared app components — accessibility", () => {
  it("EmptyState is announced", async () => {
    await expectNoViolations(<EmptyState message="No orders yet" />);
  });

  it("LoadingState is announced", async () => {
    await expectNoViolations(<LoadingState message="Loading orders" />);
  });

  it("ErrorState is announced, with its retry reachable", async () => {
    await expectNoViolations(
      <ErrorState
        message="Could not load orders"
        onRetry={() => {}}
        retryLabel="Try again"
      />,
    );
  });

  it("ErrorIndicator is announced", async () => {
    await expectNoViolations(
      <ErrorIndicator error="Something went wrong" onRetry={() => {}} />,
    );
  });

  it("catches a violation it should catch", async () => {
    // Proves the checker is wired up. A button whose only content is an icon
    // has no accessible name, which is one of the most common real defects.
    const { container } = render(
      <button type="button">
        <svg aria-hidden="true" />
      </button>,
    );
    const results = (await axe(container)) as AxeResults;

    expect(results.violations.map((v) => v.id)).toContain("button-name");
  });
});
