import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const usePlugin = (opts = {}) => [
  join(__dirname, "./target/wasm32-wasi/release/purebundle.wasm"),
  opts
];