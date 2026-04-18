"use client";

import { type Ref, type TextareaHTMLAttributes, useRef } from "react";
import { cn } from "ui";

import { useAutoResize } from "@/features/products/application/hooks/useAutoResize";

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
  const autoResize = useAutoResize(localRef, String(value ?? ""));

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
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/50",
        className,
      )}
      {...props}
    />
  );
}
