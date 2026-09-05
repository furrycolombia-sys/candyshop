/**
 * Runtime accessibility coverage for the shared UI primitives.
 *
 * `eslint-plugin-jsx-a11y` already checks these components statically, but a
 * static rule cannot see a computed contrast ratio, a control that ends up
 * without an accessible name, or a role that becomes invalid once the
 * component renders. Every app in the monorepo builds on these primitives, so
 * a violation here is a violation everywhere.
 */
import { render } from "@testing-library/react";
import type { AxeResults } from "axe-core";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AnalysisProgress } from "@ui/components/AnalysisProgress";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/components/card";
import { Chip } from "@ui/components/chip";
import { CircularProgress } from "@ui/components/CircularProgress";
import { InfoBadge } from "@ui/components/InfoBadge";
import { Input } from "@ui/components/input";
import { ProgressBar } from "@ui/components/ProgressBar";
import { Separator } from "@ui/components/separator";
import { Skeleton } from "@ui/components/skeleton";
import { StatusCard } from "@ui/components/StatusCard";
import { StatusLabel } from "@ui/components/StatusLabel";

async function expectNoViolations(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = (await axe(container)) as AxeResults;

  // Report the rule ids rather than a bare boolean, so a failure says which
  // rule broke without having to re-run anything.
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

describe("shared UI primitives — accessibility", () => {
  it("Button has an accessible name", async () => {
    await expectNoViolations(<Button>Save changes</Button>);
  });

  it("Button remains accessible when disabled", async () => {
    await expectNoViolations(<Button disabled>Save changes</Button>);
  });

  it("Input is labelled by a real <label>", async () => {
    // Deliberately a plain <label>, not this package's `Label`. See the test
    // below: `Label` here is a status badge, not a form label.
    await expectNoViolations(
      <>
        <label htmlFor="email">Email</label>
        <Input id="email" type="email" />
      </>,
    );
  });

  it("Input without a label is caught", async () => {
    // Proves this suite can fail. An unlabelled input is one of the most
    // common real accessibility defects, and axe must flag it.
    const { container } = render(<Input type="email" />);
    const results = (await axe(container)) as AxeResults;

    expect(results.violations.map((v) => v.id)).toContain("label");
  });

  it("StatusLabel is a badge, not a form label", async () => {
    // It renders a <span> and carries no htmlFor. Under its old name, `Label`,
    // it collided with the shadcn convention where label.tsx IS the form label
    // -- importing it to label an input gave no association at all. The name
    // is fixed; this pins the shape so the trap cannot come back.
    const { container } = render(<StatusLabel>Healthy</StatusLabel>);

    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector("span")).not.toBeNull();
    await expectNoViolations(<StatusLabel>Healthy</StatusLabel>);
  });

  it("Badge carries its text", async () => {
    await expectNoViolations(<Badge>New</Badge>);
  });

  it("Card exposes a heading and body", async () => {
    await expectNoViolations(
      <Card>
        <CardHeader>
          <CardTitle>Monthly sales</CardTitle>
          <CardDescription>Totals for the current period</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>,
    );
  });

  it("Avatar fallback is readable", async () => {
    await expectNoViolations(
      <Avatar>
        <AvatarFallback>HA</AvatarFallback>
      </Avatar>,
    );
  });

  it("Separator is exposed correctly", async () => {
    await expectNoViolations(
      <div>
        <span>Above</span>
        <Separator />
        <span>Below</span>
      </div>,
    );
  });

  it("Skeleton does not announce itself as content", async () => {
    await expectNoViolations(<Skeleton className="h-4 w-32" />);
  });

  it("StatusCard is readable", async () => {
    await expectNoViolations(<StatusCard>All systems normal</StatusCard>);
  });

  it("InfoBadge is readable", async () => {
    await expectNoViolations(<InfoBadge>Beta</InfoBadge>);
  });

  it("Chip is readable", async () => {
    await expectNoViolations(<Chip count={3} aria-label="3 unread" />);
  });

  it("ProgressBar reports its progress", async () => {
    await expectNoViolations(
      <ProgressBar value={42} aria-label="Upload progress" />,
    );
  });

  it("CircularProgress reports its progress", async () => {
    await expectNoViolations(
      <CircularProgress value={42} aria-label="Analysis progress" />,
    );
  });

  it("AnalysisProgress does not trap or mislabel its phases", async () => {
    await expectNoViolations(
      <AnalysisProgress phases={["Reading orders", "Totalling"]} />,
    );
  });
});
