import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/component/**/*.test.tsx"],
    setupFiles: ["tests/component/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
    },
  },
});
