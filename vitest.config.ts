/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "coverage/**",
        "test/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/", ".next/"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      "@/app": resolve(__dirname, "./app"),
      "@/lib": resolve(__dirname, "./lib"),
      "@/test": resolve(__dirname, "./test"),
    },
  },
});
