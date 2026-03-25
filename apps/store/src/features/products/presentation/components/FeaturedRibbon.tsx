"use client";

import { useEffect, useRef } from "react";

interface FeaturedRibbonProps {
  label: string;
  /** CSS variable name for the category color, e.g. "--pink" */
  accentVar: string;
  size?: "sm" | "lg";
}

const CONFIG = {
  sm: { px: 160, baseFontSize: 14, textOffset: 0.32 },
  lg: { px: 200, baseFontSize: 17, textOffset: 0.32 },
} as const;

const SSR_PIXEL_RATIO = 2;
const DEVICE_PIXEL_RATIO =
  globalThis.window === undefined
    ? SSR_PIXEL_RATIO
    : globalThis.window.devicePixelRatio || 1;

/** Canvas drawing constants */
const LETTER_SPACING_RATIO = 0.15;
const MAX_WIDTH_RATIO = 0.65;
const SHINE_DURATION_MS = 2500;
const SHINE_PAUSE_MS = 1500;
const CYCLE_MS = SHINE_DURATION_MS + SHINE_PAUSE_MS;
const FALLBACK_COLOR = "#e91e63";

/* Shine gradient stops */
const SHINE_BAND_START = -0.3;
const SHINE_BAND_RANGE = 1.6;
const SHINE_STOP_EDGE = 0.4;
const SHINE_STOP_CENTER = 0.5;
const SHINE_STOP_END = 0.6;
const SHINE_OPACITY = "rgba(255,255,255,0.5)";
const SHINE_TRANSPARENT = "rgba(255,255,255,0)";

/* Text rotation: -45 degrees in radians */
const DIAGONAL_DIVISOR = 4;
const TEXT_ANGLE = -Math.PI / DIAGONAL_DIVISOR;

const FONT_STACK = "Syne, sans-serif";

const HALF_DIVISOR = 2;

/** Measure total width of spaced text */
function measureSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  spacing: number,
): number {
  const chars = [...text];
  return chars.reduce(
    (w, ch) => w + ctx.measureText(ch).width + spacing,
    -spacing,
  );
}

/** Draw text character by character with manual letter spacing */
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  const totalWidth = measureSpacedText(ctx, text, spacing);
  let cx = x - totalWidth / HALF_DIVISOR;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

export function FeaturedRibbon({
  label,
  accentVar,
  size = "sm",
}: FeaturedRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { px: s, baseFontSize, textOffset } = CONFIG[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // eslint-disable-next-line i18next/no-literal-string -- canvas context type
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = s * DEVICE_PIXEL_RATIO;
    canvas.height = s * DEVICE_PIXEL_RATIO;
    ctx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO);

    // Resolve CSS variable to actual color
    const style = getComputedStyle(canvas);
    const bgColor =
      style.getPropertyValue(accentVar).trim() ||
      style
        .getPropertyValue(`--color-${accentVar.replace(/^-+/, "")}`)
        .trim() ||
      FALLBACK_COLOR;

    const text = label.toUpperCase();
    let finalFontSize: number = baseFontSize;
    let finalSpacing: number = baseFontSize * LETTER_SPACING_RATIO;
    let animId: number;

    function draw(timestamp: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, s, s);

      // 1. Triangle
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.closePath();
      ctx.fillStyle = bgColor;
      ctx.fill();

      // 2. Shine sweep (clipped to triangle)
      ctx.clip();
      const cycle = timestamp % CYCLE_MS;
      if (cycle < SHINE_DURATION_MS) {
        const progress = cycle / SHINE_DURATION_MS;
        const bandCenter = SHINE_BAND_START + progress * SHINE_BAND_RANGE;
        const bw = LETTER_SPACING_RATIO;
        const grad = ctx.createLinearGradient(
          (bandCenter - bw) * s,
          (bandCenter - bw) * s,
          (bandCenter + bw) * s,
          (bandCenter + bw) * s,
        );
        grad.addColorStop(0, SHINE_TRANSPARENT);
        grad.addColorStop(SHINE_STOP_EDGE, SHINE_TRANSPARENT);
        grad.addColorStop(SHINE_STOP_CENTER, SHINE_OPACITY);
        grad.addColorStop(SHINE_STOP_END, SHINE_TRANSPARENT);
        grad.addColorStop(1, SHINE_TRANSPARENT);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);
      }
      ctx.restore();

      // 3. Text along diagonal
      ctx.save();
      ctx.translate(s * textOffset, s * textOffset);
      ctx.rotate(TEXT_ANGLE);
      ctx.fillStyle = "white";
      ctx.font = `800 ${String(finalFontSize)}px ${FONT_STACK}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      drawSpacedText(ctx, text, 0, 0, finalSpacing);
      ctx.restore();

      animId = requestAnimationFrame(draw);
    }

    // Wait for fonts, then auto-scale text to fit
    document.fonts.ready.then(() => {
      ctx.font = `800 ${String(baseFontSize)}px ${FONT_STACK}`;
      const baseSpacing = baseFontSize * LETTER_SPACING_RATIO;
      const measured = measureSpacedText(ctx, text, baseSpacing);
      const maxWidth = s * MAX_WIDTH_RATIO;
      if (measured > maxWidth) {
        const scale = maxWidth / measured;
        finalFontSize = Math.floor(baseFontSize * scale);
        finalSpacing = finalFontSize * LETTER_SPACING_RATIO;
      } else {
        finalFontSize = baseFontSize;
        finalSpacing = baseSpacing;
      }
      animId = requestAnimationFrame(draw);
    });

    return () => cancelAnimationFrame(animId);
  }, [s, baseFontSize, textOffset, accentVar, label]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 z-20 pointer-events-none"
      style={{ width: s, height: s }}
      aria-hidden="true"
    />
  );
}
