"use client";

import { type RefObject, useCallback, useEffect } from "react";

/** Shared auto-resize logic for textareas — grows/shrinks to fit content.
 *  Pass a `key` string that changes when the textarea content changes externally. */
export function useAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  key: string,
) {
  const autoResize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref]);

  useEffect(() => {
    autoResize();
  }, [autoResize, key]);

  return autoResize;
}
