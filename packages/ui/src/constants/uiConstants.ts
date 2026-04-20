/**
 * UI Constants
 * Centralized magic numbers for UI components
 */

export const UI_CONSTANTS = {
  // Z-index layers
  Z_INDEX: {
    MODAL: 100,
    NAVIGATION_PROGRESS: 100,
    TOAST: 50,
    NAVBAR: 20,
  },

  // Navigation constants
  NAVIGATION: {
    PROGRESS_MAX: 90,
    PROGRESS_DIVISOR: 10,
    PROGRESS_INTERVAL_MS: 100,
    PROGRESS_HIDE_DELAY_MS: 300,
    DEFAULT_HEIGHT: 3, // Default progress bar height in pixels
  },

  // Chart and visualization constants
  CHART: {
    SPARKLINE_WIDTH: 100,
    SPARKLINE_PADDING: 2,
    SPARKLINE_HEIGHT_DEFAULT: 32,
    SPARKLINE_STROKE_WIDTH: 1.5,
    SPARKLINE_DOT_RADIUS: 2,
    SPARKLINE_MIN_RANGE: 1,
    SPARKLINE_MIN_SEGMENTS: 1,
    GRADIENT_START: "0%",
    GRADIENT_END: "100%",
    GRADIENT_START_OPACITY: 0.2,
    GRADIENT_END_OPACITY: 0,
    // SVG flow constants
    FLOW_ARROW_WIDTH: 8,
    FLOW_ARROW_HEIGHT: 8,
    FLOW_ARROW_REF_X: 7,
    FLOW_ARROW_REF_Y: 2.5,
    FLOW_LINE_WIDTH: 70,
    FLOW_LINE_Y: 12,
    FLOW_GLOW_STROKE_WIDTH: 4,
    FLOW_MAIN_STROKE_WIDTH: 2.5,
    FLOW_DOT_RADIUS: 2.5,
    FLOW_BLUR_RADIUS: "2px",
    FLOW_GLOW_OPACITY: 0.6,
    FLOW_ANIMATION_DURATION: "2s",
    // Chart heights - used for ResponsiveContainer and inline MiniAreaChart
    STANDARD_HEIGHT: 200,
    BAR_CHART_HEIGHT: 250,
    SIDEBAR_SPARKLINE_HEIGHT: 40,
    // Chart typography - Numeric values for Recharts (Recharts doesn't understand Tailwind classes)
    FONT_SIZE: 12,
    LEGEND_FONT_SIZE: 12,
    LEGEND_PADDING_TOP: 8,
    LEGEND_ICON_SIZE: 8,
    // Chart stroke widths
    STROKE_WIDTH: 2,
    // Chart styling
    TOOLTIP_BORDER_RADIUS: "6px",
    // Chart opacity
    FILL_OPACITY: 1,
    // Chart dots
    SHOW_DOTS: false,
    // Chart axis
    SHOW_TICK_LINE: false,
    SHOW_AXIS_LINE: false,
    // Chart grid
    STROKE_DASHARRAY: "3 3",
    // Chart legend
    LEGEND_ICON_TYPE: "circle",
    // Chart bar radius
    BAR_RADIUS: [4, 4, 0, 0] as [number, number, number, number],
    // Chart margins
    MARGIN: { top: 5, right: 10, left: 0, bottom: 0 },
    // Gradient stop opacity values
    GRADIENT_STOP_OPACITY: {
      START: 0.3,
      QUARTER: 0.5,
      HALF: 0.7,
      THREE_QUARTERS: 0.85,
      FULL: 1,
      GLOW_START: 0,
      GLOW_HALF: 0.15,
      GLOW_END: 0,
    },
    // Area chart gradient opacity
    AREA_GRADIENT_START_OPACITY: 0.8,
    AREA_GRADIENT_END_OPACITY: 0.1,
    // Flow element opacity
    FLOW_ARROW_OPACITY: 1,
    FLOW_DOT_OPACITY: 0.9,
    FLOW_SECONDARY_DOT_OPACITY: 0.5,
  },
} as const;
