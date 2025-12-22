import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["nodepkg/*", "."],
    outputFile: {
      html: "./target/vitest-report/index.html",
    },
  },
});
