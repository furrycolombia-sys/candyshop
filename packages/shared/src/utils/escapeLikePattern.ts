/** Escape SQL LIKE wildcards (%, _, \) to prevent pattern injection */
export function escapeLikePattern(input: string): string {
  return input.replaceAll(/[%_\\]/g, (char) => `\\${char}`);
}
