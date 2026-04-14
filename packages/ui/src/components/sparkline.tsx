import * as React from "react";

import { UI_CONSTANTS } from "@ui/constants/ui-constants";
import { cn } from "@ui/utils/cn";

interface SparklineProps extends React.HTMLAttributes<HTMLDivElement> {
  data: number[];
  color?: string;
  height?: number;
  showDots?: boolean;
}

function Sparkline({
  data,
  color = "var(--brand)",
  height = UI_CONSTANTS.CHART.SPARKLINE_HEIGHT_DEFAULT,
  showDots = false,
  className,
  ...props
}: SparklineProps) {
  const gradientId = React.useId();

  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || UI_CONSTANTS.CHART.SPARKLINE_MIN_RANGE;

  const width = UI_CONSTANTS.CHART.SPARKLINE_WIDTH;
  const padding = UI_CONSTANTS.CHART.SPARKLINE_PADDING;
  const effectiveHeight = height - padding * 2;
  const segmentWidth =
    width /
    (data.length - UI_CONSTANTS.CHART.SPARKLINE_MIN_SEGMENTS ||
      UI_CONSTANTS.CHART.SPARKLINE_MIN_SEGMENTS);

  // Generate path for the line
  const pathPoints = data
    .map((value, index) => {
      const x = index * segmentWidth;
      const y =
        padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return `${index === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  // Generate area path
  const areaPath = `${pathPoints} L ${width},${height} L 0,${height} Z`;

  return (
    <div className={cn("relative", className)} {...props}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Area gradient */}
        <defs>
          <linearGradient
            id={`gradient-${gradientId}`}
            x1={UI_CONSTANTS.CHART.GRADIENT_START}
            x2={UI_CONSTANTS.CHART.GRADIENT_START}
            y1={UI_CONSTANTS.CHART.GRADIENT_START}
            y2={UI_CONSTANTS.CHART.GRADIENT_END}
          >
            <stop
              offset={UI_CONSTANTS.CHART.GRADIENT_START}
              stopColor={color}
              stopOpacity={UI_CONSTANTS.CHART.GRADIENT_START_OPACITY}
            />
            <stop
              offset={UI_CONSTANTS.CHART.GRADIENT_END}
              stopColor={color}
              stopOpacity={UI_CONSTANTS.CHART.GRADIENT_END_OPACITY}
            />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={areaPath}
          fill={`url(#gradient-${gradientId})`}
          className="opacity-50"
        />

        {/* Line */}
        <path
          d={pathPoints}
          fill="none"
          stroke={color}
          strokeWidth={UI_CONSTANTS.CHART.SPARKLINE_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Dots */}
        {showDots &&
          data.map((value, index) => {
            const x = index * segmentWidth;
            const y =
              padding +
              effectiveHeight -
              ((value - min) / range) * effectiveHeight;
            return (
              <circle
                // eslint-disable-next-line react/no-array-index-key -- Static number[] with no reordering; index is the only stable identifier
                key={index}
                cx={x}
                cy={y}
                r={UI_CONSTANTS.CHART.SPARKLINE_DOT_RADIUS}
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
      </svg>
    </div>
  );
}

export { Sparkline };
