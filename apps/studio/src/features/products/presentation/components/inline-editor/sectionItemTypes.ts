import type { UseFieldArrayReturn } from "react-hook-form";

/** Narrowed field array interface passed to section item editors.
 * Uses UseFieldArrayReturn directly (default generics) to match the dynamic
 * `sections.${n}.items` path that requires `as any` for react-hook-form. */
export type SectionFieldArray = UseFieldArrayReturn;
