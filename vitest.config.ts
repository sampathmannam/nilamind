import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Service/logic tests run in node (fast). Component render tests are .test.tsx and opt into jsdom via a
    // per-file `// @vitest-environment jsdom` docblock, so the node suite stays untouched (audit #27).
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
