import init, {
  aes_256_decrypt as _aes_256_decrypt,
  aes_256_encrypt as _aes_256_encrypt,
  chacha20_decrypt as _chacha20_decrypt,
  chacha20_encrypt as _chacha20_encrypt,
  generate_aes_256_key as _generate_aes_256_key,
  generate_chacha20_key as _generate_chacha20_key,
  rsa_oaep_encrypt as _rsa_oaep_encrypt,
} from "./pkg/crypto";

// make vite happy
import wasmURL from "./pkg/crypto_bg.wasm?url";

export const generate_aes_256_key = (mode = "CFB") => {
  return init({ module_or_path: wasmURL }).then(() => _generate_aes_256_key(mode));
};

export const generate_chacha20_key = () => {
  return init({ module_or_path: wasmURL }).then(() => _generate_chacha20_key(""));
};

export const rsa_oaep_encrypt = (payload, key) => {
  return init({ module_or_path: wasmURL }).then(() =>
    _rsa_oaep_encrypt(payload, JSON.stringify(key)),
  );
};

export const aes_256_decrypt = (payload, key) => {
  return init({ module_or_path: wasmURL }).then(() => _aes_256_decrypt(payload, key));
};

export const aes_256_encrypt = (payload, key) => {
  return init({ module_or_path: wasmURL }).then(() => _aes_256_encrypt(payload, key));
};

export const chacha20_encrypt = (payload, key) => {
  return init({ module_or_path: wasmURL }).then(() => _chacha20_encrypt(payload, key));
};

export const chacha20_decrypt = (payload, key) => {
  return init({ module_or_path: wasmURL }).then(() => _chacha20_decrypt(payload, key));
};

// aliases
export const aes_256_cfb_decrypt = aes_256_decrypt;
export const aes_256_cfb_encrypt = aes_256_encrypt;
