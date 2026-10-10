import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
  ],
  // vitest: only the app's own tests (skills under .claude/ ship their own node:test files)
  test: {
    exclude: ["node_modules/**", "dist/**", ".claude/**"],
  },
});
