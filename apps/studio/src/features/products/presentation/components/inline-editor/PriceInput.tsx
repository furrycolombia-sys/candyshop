"use client";

import { useCallback, useEffect, useRef } from "react";
import { tid } from "shared";

/** Strip everything except digits */
function digitsOnly(value: string): string {
  return value.replaceAll(/\D/g, "");
}

const PADDING_PX = 8;
const MIN_WIDTH_PX = 32;

/**
 * Auto-sizing price input — grows with content, digits only.
 * Uses an invisible span to measure text width.
 */
export function PriceInput({
  inputRef,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  testId,
}: {
  inputRef: React.Ref<HTMLInputElement>;
  value: string | number | null;
  onChange: (val: string) => void;
  onBlur: () => void;
  placeholder: string;
  className: string;
  testId: string;
}) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const localRef = useRef<HTMLInputElement | null>(null);

  const displayValue =
    value === null || value === undefined ? "" : String(value);

  const resize = useCallback(() => {
    const input = localRef.current;
    const measure = measureRef.current;
    if (!input || !measure) return;
    measure.textContent = input.value || input.placeholder;
    input.style.width = `${Math.max(measure.offsetWidth + PADDING_PX, MIN_WIDTH_PX)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [displayValue, resize]);

  return (
    <span className="relative inline-block">
      <span
        ref={measureRef}
        className={`invisible absolute whitespace-pre ${className}`}
        aria-hidden="true"
      />
      <input
        ref={(el) => {
          localRef.current = el;
          if (typeof inputRef === "function") inputRef(el);
        }}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(e) => {
          const cleaned = digitsOnly(e.target.value);
          onChange(cleaned);
          requestAnimationFrame(resize);
        }}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`bg-transparent outline-none placeholder:text-muted-foreground/30 ${className}`}
        {...tid(testId)}
      />
    </span>
  );
}
