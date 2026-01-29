import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import path from "path";

// Load .env.test first, then fallback to .env
config({ path: ".env.test" });
config(); // Load .env for DATABASE_URL and other vars

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
