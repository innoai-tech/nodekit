import { transform, usePlugin } from "@innoai-tech/purebundle";
import { type Plugin } from "rolldown";

export const chunkCleanup = (
  opt: {
    minify?: boolean;
    env?: {
      targets?: string | { [K: string]: string };
      mode?: string;
      coreJs?: string;
      exclude?: string[];
      include?: string[];
    };
  } = {},
): Plugin => {
  return {
    name: "monobundle/chunk-cleanup",

    async renderChunk(code: string) {
      return (
        await transform(code, {
          minify: opt.minify ?? false,
          plugins: [usePlugin({})],
        })
      ).code;
    },
  };
};
