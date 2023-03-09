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

        c.resolve = c.resolve ?? {};
      }
    },
    tsconfigPaths({})
  ];
};
