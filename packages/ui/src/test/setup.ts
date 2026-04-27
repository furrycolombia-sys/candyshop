import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(matchers);

// Vitest 4 moved Assertion to @vitest/expect; augment it directly for jest-dom compat.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
declare module "@vitest/expect" {
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<
    any,
    any
  > {}
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
