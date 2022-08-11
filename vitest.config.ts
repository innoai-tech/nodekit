import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    include: [
      "nodedevpkg/**/__tests__/*.{generator,test,spec}.{ts,tsx}",
      "nodepkg/**/__tests__/*.{generator,test,spec}.{ts,tsx}",
    ],
  },
});