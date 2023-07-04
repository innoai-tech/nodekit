import type { Plugin } from "rollup";
import { transform } from "@innoai-tech/purebundle";


export const chunkCleanup = (opts: {
  env?: {
    targets?: string | { [K: string]: string }
    mode?: string,
    coreJs?: string,
  }
} = {}): Plugin => {
  return {
    name: "monobundle/chunk-cleanup",
    async renderChunk(code: string) {
      try {
        return await transform(code, opts);
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
  };
};
