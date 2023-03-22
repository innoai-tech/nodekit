import { defineConfig } from "vite";
import { app, viteChunkSplit, viteReact } from "@innoai-tech/vite-presets";
import { chunkCleanup } from "@innoai-tech/monobundle";

export default defineConfig({
  plugins: [
    app("example"),
    viteReact(),
    viteChunkSplit({
      libRoot: [
        "../../nodepkg"
      ]
    }),
    chunkCleanup()
  ]
});
