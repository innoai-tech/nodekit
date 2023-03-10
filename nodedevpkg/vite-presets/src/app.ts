import { resolve } from "path";
import { PluginOption, searchForWorkspaceRoot } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export const app = (
  appName: string,
  { enableBaseHref }: { enableBaseHref?: boolean } = {}
): PluginOption[] => {
  (process.env as any).APP_VERSION = "__VERSION__";

  const viteConfigRoot = searchForWorkspaceRoot(".");

  return [
    {
      name: "vite-presets/app",
      config(c) {
        c.base = enableBaseHref ? `/${appName}/` : "/";
        c.root = resolve(viteConfigRoot, "./src");

        c.build = c.build ?? {};

        c.build.outDir = resolve(viteConfigRoot, "./dist");
        c.build.emptyOutDir = true;

        c.build.rollupOptions = c.build.rollupOptions ?? {};

        c.build.assetsDir = c.build.assetsDir ?? "assets";

        // to avoid some filename starts with _
        c.build.rollupOptions.output = {
          assetFileNames: `${c.build.assetsDir}/[name].[hash][extname]`,
          entryFileNames: `${c.build.assetsDir}/[name].[hash].entry.js`,
          chunkFileNames: `${c.build.assetsDir}/[name].[hash].chunk.js`
        };

        c.resolve = c.resolve ?? {};
        c.resolve.alias = c.resolve.alias ?? {} as Record<string, string>;
        (c.resolve.alias as any)["src"] = c.root;
      }
    },
    {
      ...tsconfigPaths({}),
      apply: "serve"
    }

  ];
};
