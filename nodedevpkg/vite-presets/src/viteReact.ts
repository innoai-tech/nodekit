import type { PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import pages, { reactResolver, type PageResolver } from "vite-plugin-pages";

export interface ViteReactOptions {
  pagesDirs?: string | string[]
  pagesResolver?: Partial<PageResolver>,
}

export const pagesResolverStringify = {
  dynamicImport: (path: string) => `(() => {
    const fetch = () => import("${path}");
    const C = lazy(fetch);
    C.fetch = fetch;
    return C;
  })()`,
  component: (ComponentName: string) => ` jsx(${ComponentName}, {})`,
  final: (code: string) => `import { lazy } from "react";
import { jsx } from "react/jsx-runtime";  
${code}
`
};

export const viteReact = (options: ViteReactOptions = {}): PluginOption[] => {
  return [
    {
      name: "vite-presets/react",
      config(c) {
        c.resolve = c.resolve ?? {};
        c.resolve.dedupe = c.resolve.dedupe ?? [];
        c.resolve.dedupe = [
          ...c.resolve.dedupe,
          "react", "react-dom", "@emotion/react"
        ];
      }
    },
    react(),
    pages({
      dirs: options.pagesDirs ?? "./app/routes",
      resolver: {
        ...reactResolver(),
        stringify: pagesResolverStringify,
        ...(options.pagesResolver ?? {})
      }
    })
  ];
};

