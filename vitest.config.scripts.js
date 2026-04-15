import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/__tests__/**/*.test.{js,ts}"],
    globals: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
