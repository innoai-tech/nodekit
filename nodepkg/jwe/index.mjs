import init, { encrypt as _encrypt } from "./pkg/jwe";

// make vite happy
import wasmURL from "./pkg/jwe_bg.wasm?url";

export const encrypt = (payload, jwk) => {
  return init(wasmURL).then(() => _encrypt(payload, JSON.stringify(jwk)));
};