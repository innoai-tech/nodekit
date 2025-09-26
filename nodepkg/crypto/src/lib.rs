use aes::cipher::AsyncStreamCipher;
use aes::cipher::KeyIvInit;
use aes::Aes256;
use base64ct::{Base64, Base64UrlUnpadded, Encoding};
use cipher::StreamCipher;
use ctr::Ctr64LE;
use rand::rngs::OsRng;
use rsa::{BigUint, Oaep, RsaPublicKey};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::Sha256;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
struct JWK {
    alg: String,
    kid: String,
    kty: String,
    n: String,
    e: String,
}

#[wasm_bindgen]
pub fn rsa_oaep_encrypt(payload: &[u8], jwk_json: &str) -> String {
    let jwk: JWK = serde_json::from_str(&jwk_json).unwrap();
    let n = Base64UrlUnpadded::decode_vec(&jwk.n).unwrap();
    let e = Base64::decode_vec(&jwk.e).unwrap();
    let pub_key =
        RsaPublicKey::new(BigUint::from_bytes_be(&n), BigUint::from_bytes_be(&e)).unwrap();

    let encrypted_data = match jwk.alg.as_str() {
        "RSA-OAEP-256" => pub_key.encrypt(&mut OsRng, Oaep::new::<Sha256>(), payload),
        "RSA-OAEP" | _ => pub_key.encrypt(&mut OsRng, Oaep::new::<Sha1>(), payload),
    }
    .unwrap();

    return Base64UrlUnpadded::encode_string(&encrypted_data);
}

#[derive(Serialize, Deserialize)]
struct Key {
    enc: String,
    key: String,
    nonce: String,
}

#[wasm_bindgen]
pub fn generate_aes_256_key(mode: &str) -> String {
    let key: [u8; 32] = rand::random();
    let nonce: [u8; 16] = rand::random();

    let protected = Key {
        enc: match mode.to_uppercase().as_str() {
            "CTR" => "AES-256-CTR".to_string(),
            "CFB" | "" | _ => "AES-256-CFB".to_string(),
        },
        key: Base64UrlUnpadded::encode_string(&key),
        nonce: Base64UrlUnpadded::encode_string(&nonce),
    };

    serde_json::to_string(&protected).unwrap()
}

#[wasm_bindgen]
pub fn generate_chacha20_key() -> String {
    let key: [u8; 32] = rand::random();
    let nonce: [u8; 12] = rand::random();

    let protected = Key {
        enc: "CHACHA20".to_string(),
        key: Base64UrlUnpadded::encode_string(&key),
        nonce: Base64UrlUnpadded::encode_string(&nonce),
    };

    serde_json::to_string(&protected).unwrap()
}

#[wasm_bindgen]
pub fn aes_256_encrypt(payload: &[u8], key_json: &str) -> Vec<u8> {
    let k: Key = serde_json::from_str(key_json).expect("invalid key json");
    let key = Base64UrlUnpadded::decode_vec(&k.key).expect("bad key b64");
    let iv = Base64UrlUnpadded::decode_vec(&k.nonce).expect("bad nonce b64");

    match k.enc.as_str() {
        "AES-256-CTR" => {
            let mut cipher = Ctr64LE::<Aes256>::new_from_slices(&key, &iv).unwrap();
            let mut buf = payload.to_vec();
            cipher.apply_keystream(&mut buf);
            buf
        }
        _ => {
            let cipher = cfb8::Encryptor::<Aes256>::new_from_slices(&key, &iv).unwrap();
            let mut buf = payload.to_vec();
            cipher.encrypt(&mut buf);
            buf
        }
    }
}

#[wasm_bindgen]
pub fn aes_256_decrypt(payload: &[u8], key_json: &str) -> Vec<u8> {
    let k: Key = serde_json::from_str(key_json).expect("invalid key json");
    let key = Base64UrlUnpadded::decode_vec(&k.key).expect("bad key b64");
    let iv = Base64UrlUnpadded::decode_vec(&k.nonce).expect("bad nonce b64");

    match k.enc.as_str() {
        "AES-256-CTR" => {
            let mut cipher = Ctr64LE::<Aes256>::new_from_slices(&key, &iv).unwrap();
            let mut buf = payload.to_vec();
            cipher.apply_keystream(&mut buf);
            buf
        }
        _ => {
            let cipher = cfb8::Decryptor::<Aes256>::new_from_slices(&key, &iv).unwrap();
            let mut buf = payload.to_vec();
            let _ = cipher.decrypt_b2b(payload, &mut buf);
            buf
        }
    }
}

#[wasm_bindgen]
pub fn chacha20_encrypt(payload: &[u8], key_json: &str) -> Vec<u8> {
    let k: Key = serde_json::from_str(key_json).expect("invalid key json");
    let key = Base64UrlUnpadded::decode_vec(&k.key).expect("bad key b64");
    let nonce = Base64UrlUnpadded::decode_vec(&k.nonce).expect("bad nonce b64");

    match k.enc.as_str() {
        "CHACHA20" | _ => {
            let mut cipher = chacha20::ChaCha20::new_from_slices(&key, &nonce).unwrap();
            let mut buf = payload.to_vec();
            cipher.apply_keystream(&mut buf);
            buf
        }
    }
}

#[wasm_bindgen]
pub fn chacha20_decrypt(payload: &[u8], key_json: &str) -> Vec<u8> {
    chacha20_encrypt(payload, key_json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_do_rsa_oaep_encrypt() {
        let payload = "{}";
        let key = r#"
        {
            "alg": "RSA-OAEP",
            "e": "AQAB",
            "kid": "jSaViAqt/oc",
            "kty": "RSA",
            "n": "wv42EvfPu3KMzc9fVNJpQnlHmov9VMK96BcAYmgudYvCwYcHyINhglp-4L-vgoxQFFzLz6tmqk6BdsBz_Q9oXurtGGARk7mrl2xS45l2dUKJzaz2E7-VzRQzE5JbEDYrtnh-Qt0ETElfdzc9mCLw6rrVYyM6AZEhhb62ylgS7z6EMxX_xhVoa0mij2MFzW1dHKLDfCuUwd5drDYheF_i7FcFyT41Gc3qEk-1EubTVsxbdyrPRmLt9oCvLx7JbOoLivyv8q13LQkuTUOCqPoYJCdkhSXrKQTi30UkCTJCul9qvyJvUcql3pqb9w-LD4IxhC4OYwt1TuO_SedUdRD8Cw",
            "use": "enc"
        }
        "#;

        println!("{}", rsa_oaep_encrypt(payload.as_bytes(), key))
    }

    #[test]
    fn should_do_aes_256_cfb_encrypt_and_decrypt() {
        let plaintext = "1234567890";
        let key = generate_aes_256_key("cfb");
        println!("{:?}", key);

        let encrypted = aes_256_encrypt(plaintext.as_bytes(), &key);
        println!("{:?}", encrypted);

        let decrypted = aes_256_decrypt(encrypted.as_slice(), &key);
        println!("{:?}", decrypted);
    }

    #[test]
    fn should_do_aes_256_ctr_encrypt_and_decrypt() {
        let key = generate_aes_256_key("ctr");
        println!("{:?}", key);

        let plaintext = "1234567890";

        let encrypted = aes_256_encrypt(plaintext.as_bytes(), &key);
        println!("{:?}", encrypted);

        let decrypted = aes_256_decrypt(encrypted.as_slice(), &key);
        println!("{:?}", decrypted);
    }

    #[test]
    fn should_do_chacha20_encrypt_and_decrypt() {
        let plaintext = "1234567890";
        let key = generate_chacha20_key();
        println!("{:?}", key);

        let encrypted = chacha20_encrypt(plaintext.as_bytes(), &key);
        println!("{:?}", encrypted);

        let decrypted = chacha20_decrypt(encrypted.as_slice(), &key);
        println!("{:?}", decrypted);
    }
}
