import type { Plugin } from "rollup";

export const patchShebang = (isBin: (fileName: string) => boolean): Plugin => {
  return {
    name: "monobundle/patch-shebang",
    async renderChunk(code: string, c) {
      if (isBin(c.fileName)) {
        return `#!/usr/bin/env node

${code}`;
      }

      return null;
    },
  };
};
