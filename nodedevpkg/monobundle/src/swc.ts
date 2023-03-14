import type { Plugin } from "rollup";
import { Options, transform } from "@swc/core";

export const swc = (options: Options = {}): Plugin => {
  return {
    name: "swc",
    async transform(code: string) {
      return await transform(code, options);
    }
  };
};
