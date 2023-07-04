// add to avoid to break tests by vite.config.ts

import { defineConfig } from "vite";

export default defineConfig({
  test: {
    include: [
      "**/?(*.){test,spec}.?(c|m)[jt]s?(x)"
    ]
  }
});