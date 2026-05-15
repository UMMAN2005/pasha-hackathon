import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one SQLite file; run files sequentially in a
    // single worker and reseed per file so each starts from canonical state.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    sequence: { concurrent: false },
    testTimeout: 30000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
