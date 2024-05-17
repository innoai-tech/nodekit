export interface Key {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use?: string;

  [k: string]: any;
}

export function encrypt(payload: string, key: Key): Promise<string>