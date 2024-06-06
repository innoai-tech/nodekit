import init, {
  rsa_oaep_encrypt as _rsa_oaep_encrypt,
  generate_aes_256_key as _generate_aes_256_key,
  aes_256_cfb_decrypt as _aes_256_cfb_decrypt,
  aes_256_cfb_encrypt as _aes_256_cfb_encrypt
} from "./pkg/crypto";

// make vite happy
import wasmURL from "./pkg/crypto_bg.wasm?url";

export const generate_aes_256_key = () => {
  return init(wasmURL).then(() => _generate_aes_256_key());
};

export const aes_256_cfb_decrypt = (payload, key) => {
  return init(wasmURL).then(() => _aes_256_cfb_decrypt(payload, key));
};

export const aes_256_cfb_encrypt = (payload, key) => {
  return init(wasmURL).then(() => _aes_256_cfb_encrypt(payload, key));
};

export const rsa_oaep_encrypt = (payload, key) => {
  return init(wasmURL).then(() => _rsa_oaep_encrypt(payload, JSON.stringify(key)));
};