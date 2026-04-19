import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { beforeAll, afterEach, afterAll, expect } from "vitest";

import { server } from "@/mocks/server";

expect.extend(matchers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });

  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: () => null,
    writable: true,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
