import { extname } from "path";
import type { Plugin } from "rollup";
import { transform, usePlugin } from "@innoai-tech/vuecomponentcompleter";

export const vueComponentComplete = ({}): Plugin => {
  return {
    name: "monobundle/vue-component-complete",

    async transform(code, id) {
      const ext = extname(id);

      if (ext == ".tsx" || ext == ".ts") {

        const result = await transform(code, {
          filename: id,
          minify: false,
          plugins: [usePlugin({})]
        });

        return (
          result.code && {
            code: result.code,
            map: result.map || null
          }
        );
      }

      return null;
    }
  };
};
