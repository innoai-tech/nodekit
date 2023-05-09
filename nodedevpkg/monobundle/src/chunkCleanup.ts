import type { Plugin } from "rollup";
import { transform } from "@swc/core";
import { usePlugin } from "@innoai-tech/purebundle";

export const chunkCleanup = (): Plugin => {
  return {
    name: "monobundle/chunk",
    async renderChunk(code: string) {
      try {
        return await transform(code, {
          swcrc: false,
          env: {
            targets: "defaults",
          },
          module: {
            type: "es6",
          },
          minify: false,
          jsc: {
            parser: {
              syntax: "typescript",
              dynamicImport: true,
              tsx: false,
            },
            transform: {},
            externalHelpers: false,
            experimental: {
              plugins: [usePlugin({})],
            },
          },
          isModule: true,
        });
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
  };
};
