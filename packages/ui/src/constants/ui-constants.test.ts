import { describe, it, expect } from "vitest";

import { UI_CONSTANTS } from "./ui-constants";

describe("UI_CONSTANTS", () => {
  it("exports a frozen object (as const)", () => {
    // Verify the constants object exists and has expected top-level keys
    expect(UI_CONSTANTS).toBeDefined();
    expect(UI_CONSTANTS.Z_INDEX).toBeDefined();
    expect(UI_CONSTANTS.NAVIGATION).toBeDefined();
    expect(UI_CONSTANTS.CHART).toBeDefined();
    expect(UI_CONSTANTS.PROCESS_FLOW).toBeDefined();
  });

  it("has numeric z-index values", () => {
    expect(typeof UI_CONSTANTS.Z_INDEX.MODAL).toBe("number");
    expect(typeof UI_CONSTANTS.Z_INDEX.TOAST).toBe("number");
    expect(typeof UI_CONSTANTS.Z_INDEX.NAVBAR).toBe("number");
  });

  it("has navigation progress constants", () => {
    expect(UI_CONSTANTS.NAVIGATION.PROGRESS_MAX).toBe(90);
    expect(UI_CONSTANTS.NAVIGATION.PROGRESS_INTERVAL_MS).toBe(100);
    expect(typeof UI_CONSTANTS.NAVIGATION.DEFAULT_HEIGHT).toBe("number");
  });

  it("has chart dimension constants", () => {
    expect(typeof UI_CONSTANTS.CHART.SPARKLINE_WIDTH).toBe("number");
    expect(typeof UI_CONSTANTS.CHART.STANDARD_HEIGHT).toBe("number");
    expect(typeof UI_CONSTANTS.CHART.FONT_SIZE).toBe("number");
    expect(typeof UI_CONSTANTS.CHART.STROKE_WIDTH).toBe("number");
  });

  it("has chart bar radius as a 4-element tuple", () => {
    expect(UI_CONSTANTS.CHART.BAR_RADIUS).toHaveLength(4);
    expect(UI_CONSTANTS.CHART.BAR_RADIUS).toEqual([4, 4, 0, 0]);
  });

  it("has chart margin object with expected keys", () => {
    expect(UI_CONSTANTS.CHART.MARGIN).toEqual({
      top: 5,
      right: 10,
      left: 0,
      bottom: 0,
    });
  });

  it("has process flow constants", () => {
    expect(typeof UI_CONSTANTS.PROCESS_FLOW.MAX_QUEUE_SIZE).toBe("number");
    expect(typeof UI_CONSTANTS.PROCESS_FLOW.QUEUE_HEALTH_THRESHOLD).toBe(
      "number",
    );
    expect(UI_CONSTANTS.PROCESS_FLOW.SLA_CATEGORIES).toBeDefined();
  });
});
