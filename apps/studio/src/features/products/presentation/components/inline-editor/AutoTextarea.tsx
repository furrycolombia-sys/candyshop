"use client";

import {
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
} from "react";

/**
 * Auto-resizing textarea — grows/shrinks to fit content.
 * Drop-in replacement for `<Input>` or `<Textarea>` in section editors.
 */
export function AutoTextarea({
  className,
  onChange,
  value,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = useCallback(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  return (
    <textarea
      ref={(el) => {
        localRef.current = el;
        if (typeof ref === "function") ref(el);
      }}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        requestAnimationFrame(autoResize);
      }}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/50 ${className ?? ""}`}
      {...props}
    />
  );
}
