import { defineConfig } from "vite";
import { app, viteChunkSplit, viteReact } from "@innoai-tech/vite-presets";

export default defineConfig({
  plugins: [
    app("example"),
    viteReact(),
    viteChunkSplit({
      libRoot: [
        "../../nodepkg"
      ]
    })
  ]
});
