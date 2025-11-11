import { join } from "path";
import { fileURLToPath } from "url";
import { transform as trans } from "@swc/core";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const usePlugin = (opts = {}) => [
  join(__dirname, "./target/wasm32-wasip1/release/purebundle.wasm"),
  opts,
];

export async function transform(code, opts = {}) {
  return await trans(code, {
    filename: opts.filename,
    swcrc: false,
    module: {
      type: "es6",
    },
    env: opts.env ?? {
      targets: "defaults",
    },
    minify: opts.minify ?? false,
    jsc: {
      minify: opts.minify
        ? {
            compress: true,
            mangle: true,
          }
        : undefined,
      parser: {
        syntax: "typescript",
        dynamicImport: true,
        tsx: false,
      },
      transform: {},
      externalHelpers: false,
      experimental: opts.plugins
        ? {
            plugins: opts.plugins,
          }
        : undefined,
    },
    isModule: true,
  });
}
