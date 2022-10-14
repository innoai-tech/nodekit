import { join } from "path";
import type { PluginOption } from "vite";

export const app = (
  appName: string,
  { enableBaseHref }: { enableBaseHref?: boolean } = {}
): PluginOption => {
  return {
    name: "vite-presets/app",
    config(c) {
      c.root = "./src";
      c.base = enableBaseHref ? `/${appName}/` : "/";
      c.build = c.build ?? {};
      c.build.outDir = join(process.cwd(), "./dist");
      c.build.emptyOutDir = true;
    },
  };
};
