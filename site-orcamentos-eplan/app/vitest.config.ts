import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: ["src/tests/setup.ts"],
    include: ["src/tests/**/*.test.ts"],
  },
});
