import { defineConfig } from "vite";
import { app, viteChunkSplit, viteReact } from "@innoai-tech/vite-presets";

export default defineConfig({
  plugins: [
    app("example"),
    viteReact({
      plugins: [
        ["@innoai-tech/swc-plugin-annotate-pure-calls", {}]
      ]
    }),
    viteChunkSplit({
      libRoot: [
        "../../nodepkg"
      ]
    })
  ]
});
