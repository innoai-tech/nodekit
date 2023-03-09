import { join } from "path";
import type { PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export const app = (
  appName: string,
  { enableBaseHref }: { enableBaseHref?: boolean } = {}
): PluginOption[] => {
  return [
    {
      name: "vite-presets/app",
      async config(c) {
        c.root = "./src";
        c.base = enableBaseHref ? `/${appName}/` : "/";
        c.build = c.build ?? {};
        c.build.outDir = join(process.cwd(), "./dist");
        c.build.emptyOutDir = true;

        c.build.rollupOptions = c.build.rollupOptions ?? {};
        // to avoid some filename starts with _
        c.build.rollupOptions.output = {
          assetFileNames: "asset-[name]-[hash].js",
          entryFileNames: "entry-[name]-[hash].js",
          chunkFileNames: "chunk-[name]-[hash].js"
        };

        c.resolve = c.resolve ?? {};
      }
    },
    tsconfigPaths({})
  ];
};
