import { join } from "path";
import { fileURLToPath } from "url";
import { transform as trans } from "@swc/core";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const usePlugin = (opts = {}) => [
  join(__dirname, "./target/wasm32-wasi/release/purebundle.wasm"),
  opts
];

export async function transform(code) {
  return (
    await trans(code, {
      swcrc: false,
      module: {
        type: "es6"
      },
      minify: false,
      jsc: {
        parser: {
          syntax: "typescript",
          dynamicImport: true,
          tsx: false
        },
        transform: {},
        externalHelpers: false,
        experimental: {
          plugins: [usePlugin({})]
        }
      },
      isModule: true
    })
  ).code;
}
