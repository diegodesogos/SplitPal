// server/vitest.config.ts

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Add this 'include' array to explicitly tell
    // Vitest to look for test files inside the 'server/' directory.
    include: ["server/**/*.test.ts"],
    
    environment: "node",
    setupFiles: ["./server/vitest.setup.ts"],
    globals: true,
  },
});