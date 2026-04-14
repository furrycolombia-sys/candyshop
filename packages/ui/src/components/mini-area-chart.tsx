"use client";

import { useId } from "react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";

import { UI_CONSTANTS } from "@ui/constants/ui-constants";
import { cn } from "@ui/utils/cn";

interface MiniAreaChartDataPoint {
  value: number;
  label?: string;
}

interface MiniAreaChartProps {
  data: MiniAreaChartDataPoint[];
  color?: string;
  height?: number;
  className?: string;
  /** Unit to display in tooltip (e.g., "days", "units/hr") */
  unit?: string;
  /** Label for the metric in tooltip */
  metricLabel?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: MiniAreaChartDataPoint }>;
  unit?: string;
  metricLabel?: string;
}

function CustomTooltip({
  active,
  payload,
  unit,
  metricLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value;
  const label = payload[0]?.payload?.label;

  return (
    <div
      className="rounded-md border bg-background px-2 py-1.5 shadow-md"
      style={{ minWidth: "60px" }}
    >
      {label && <p className="text-xs text-muted-foreground mb-0.5">{label}</p>}
      <p className="text-sm font-medium">
        {typeof value === "number" ? value.toFixed(1) : value}
        {unit && (
          <span className="text-xs text-muted-foreground ml-1">{unit}</span>
        )}
      </p>
      {metricLabel && !label && (
        <p className="text-xs text-muted-foreground">{metricLabel}</p>
      )}
    </div>
  );
}

export type { MiniAreaChartDataPoint };

function MiniAreaChart({
  data,
  color = "var(--brand)",
  height = UI_CONSTANTS.CHART.SPARKLINE_HEIGHT_DEFAULT,
  className,
  unit,
  metricLabel,
}: MiniAreaChartProps) {
  // Generate a unique gradient ID using React's useId
  const id = useId();
  const gradientId = `mini-chart-gradient-${id}`;

  if (data.length === 0) return null;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={color}
                stopOpacity={UI_CONSTANTS.CHART.AREA_GRADIENT_START_OPACITY}
              />
              <stop
                offset="100%"
                stopColor={color}
                stopOpacity={UI_CONSTANTS.CHART.AREA_GRADIENT_END_OPACITY}
              />
            </linearGradient>
          </defs>
          <Tooltip
            content={<CustomTooltip unit={unit} metricLabel={metricLabel} />}
            cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={UI_CONSTANTS.CHART.SPARKLINE_STROKE_WIDTH}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { MiniAreaChart };
