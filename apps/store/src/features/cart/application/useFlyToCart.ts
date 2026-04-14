"use client";
/* eslint-disable i18next/no-literal-string -- CSS animation values, not user-facing text */

import { useCallback, useRef } from "react";

const FLY_DURATION_MS = 550;
const CART_BOUNCE_MS = 300;
const PROJECTILE_SIZE = 48;
const HALF = 2;
const ARC_LIFT = 60;
const ARC_MIN = -80;
const MID_OFFSET = 0.45;
const MID_SCALE = 0.5;
const END_SCALE = 0.2;
const END_OPACITY = 0.6;
const BOUNCE_UP = 1.2;
const BOUNCE_DOWN = 0.9;

const FLY_EASING = "cubic-bezier(0.2, 0, 0.2, 1)";
const BOUNCE_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function buildFlyKeyframes(
  targetX: number,
  targetY: number,
  arcPeakY: number,
): Keyframe[] {
  return [
    { transform: `translate(0,0) scale(1) rotate(0deg)`, opacity: 1 },
    {
      transform: `translate(${targetX * MID_SCALE}px,${arcPeakY}px) scale(0.7) rotate(180deg)`,
      opacity: 1,
      offset: MID_OFFSET,
    },
    {
      transform: `translate(${targetX}px,${targetY}px) scale(${END_SCALE}) rotate(360deg)`,
      opacity: END_OPACITY,
    },
  ];
}

function getBounceKeyframes(): Keyframe[] {
  return [
    { transform: `scale(1)` },
    { transform: `scale(${BOUNCE_UP})` },
    { transform: `scale(${BOUNCE_DOWN})` },
    { transform: `scale(1)` },
  ];
}

/**
 * Returns a ref to attach to the cart target element and a `fire` function
 * that animates a colored square from a source position to the cart button.
 *
 * Uses the Web Animations API — zero dependencies, GPU-accelerated.
 */
export function useFlyToCart() {
  const cartRef = useRef<HTMLButtonElement | null>(null);

  const fire = useCallback((sourceRect: DOMRect, color: string) => {
    const cartEl = cartRef.current;
    if (!cartEl) return;

    const cartRect = cartEl.getBoundingClientRect();

    // Create the projectile
    const dot = document.createElement("div");

    Object.assign(dot.style, {
      position: "fixed",
      zIndex: "9999",
      pointerEvents: "none",
      width: `${PROJECTILE_SIZE}px`,
      height: `${PROJECTILE_SIZE}px`,
      left: `${sourceRect.left + sourceRect.width / HALF - PROJECTILE_SIZE / HALF}px`,
      top: `${sourceRect.top + sourceRect.height / HALF - PROJECTILE_SIZE / HALF}px`,
      border: `3px solid var(--foreground)`,
      backgroundColor: color,
    });
    document.body.append(dot);

    // Target position: centre of the cart button
    const targetX =
      cartRect.left +
      cartRect.width / HALF -
      (sourceRect.left + sourceRect.width / HALF);
    const targetY =
      cartRect.top +
      cartRect.height / HALF -
      (sourceRect.top + sourceRect.height / HALF);

    const arcPeakY = Math.min(targetY - ARC_LIFT, ARC_MIN);

    dot.animate(buildFlyKeyframes(targetX, targetY, arcPeakY), {
      duration: FLY_DURATION_MS,
      easing: FLY_EASING,
      fill: "forwards",
    }).onfinish = () => {
      dot.remove();

      // Bounce the cart button on impact
      cartEl.animate(getBounceKeyframes(), {
        duration: CART_BOUNCE_MS,
        easing: BOUNCE_EASING,
      });
    };
  }, []);

  const setCartTarget = useCallback((node: HTMLButtonElement | null) => {
    cartRef.current = node;
  }, []);

  return { cartRef, setCartTarget, fire };
}
