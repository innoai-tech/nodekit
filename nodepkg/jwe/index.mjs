import wasmURL from "./jwe.wasm?url";

let wasm;

void import("./wasm_exec.js").then(() => {
  const go = new Go();

  return WebAssembly.instantiateStreaming(fetch(wasmURL), go.importObject)
    .then((obj) => {
      wasm = obj.instance;
      return go.run(obj.instance);
    });
});

export const encrypt = async (payload, key) => {
  return wasm?.exports.encrypt?.(payload, JSON.stringify(key)) ?? __go_jwe_encrypt(payload, JSON.stringify(key));
};