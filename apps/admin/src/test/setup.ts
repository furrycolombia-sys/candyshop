import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { expect, beforeAll, afterEach, afterAll } from "vitest";

expect.extend(matchers);

import { server } from "@/mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
