export interface JWK {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use?: string;

  [k: string]: any;
}

export function generate_aes_256_key(): Promise<string>

export function aes_256_cfb_decrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function aes_256_cfb_encrypt(payload: Uint8Array, key: string): Promise<Uint8Array>

export function rsa_oaep_encrypt(payload: Uint8Array, key: JWK): Promise<string>