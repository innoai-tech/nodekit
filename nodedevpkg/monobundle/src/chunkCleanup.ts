import type { Plugin } from "rollup";
import { transform } from "@innoai-tech/purebundle";

export const chunkCleanup = (): Plugin => {
  return {
    name: "monobundle/chunk-cleanup",
    async renderChunk(code: string) {
      try {
        return await transform(code);
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
  };
};
