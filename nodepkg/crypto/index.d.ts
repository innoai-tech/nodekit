export interface JWK {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use?: string;

  [k: string]: any;
}


export function rsa_oaep_encrypt(payload: Uint8Array, key: JWK): Promise<string>

export function generate_aes_256_key(mode?: "CFB" | "CTR"): Promise<string>

export function generate_chacha20_key(): Promise<string>

export function chacha20_decrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function chacha20_encrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function aes_256_decrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function aes_256_encrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function aes_256_cfb_decrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function aes_256_cfb_encrypt(payload: Uint8Array, key: string): Promise<Uint8Array>
