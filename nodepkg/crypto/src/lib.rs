use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use rsa::{
    RsaPublicKey, BigUint, Oaep,
};
use rand::rngs::OsRng;
use sha1::Sha1;
use base64ct::{Encoding, Base64, Base64UrlUnpadded};
use aes::cipher::{
    AsyncStreamCipher, KeyIvInit,
    generic_array::GenericArray,
};


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
    let pub_key = RsaPublicKey::new(BigUint::from_bytes_be(&n), BigUint::from_bytes_be(&e)).unwrap();

    // RSA-OAEP use Sha1
    // RSA-OAEP-256 use Sha256
    let encrypted_data = pub_key.encrypt(&mut OsRng, Oaep::new::<Sha1>(), payload).unwrap();
    return Base64UrlUnpadded::encode_string(&encrypted_data);
}


#[derive(Serialize, Deserialize)]
struct Key {
    enc: String,
    key: String,
    nonce: String,
}

type Aes256CfbEnc = cfb_mode::Encryptor<aes::Aes256>;

#[wasm_bindgen]
pub fn aes_256_cfb_encrypt(payload: &[u8], key_json: &str) -> Vec<u8> {
    let k: Key = serde_json::from_str(&key_json).unwrap();
    let key = Base64UrlUnpadded::decode_vec(&k.key).unwrap();
    let iv = Base64UrlUnpadded::decode_vec(&k.nonce).unwrap();

    let enc = Aes256CfbEnc::new(
        &GenericArray::clone_from_slice(&key),
        &GenericArray::clone_from_slice(&iv),
    );

    let mut ret = &mut payload.to_owned();
    let _ = enc.encrypt(&mut ret);
    return ret.to_vec();
}

type Aes256CfbDec = cfb_mode::Decryptor<aes::Aes256>;

#[wasm_bindgen]
pub fn aes_256_cfb_decrypt(payload: &[u8], key_json: &str) -> Vec<u8> {
    let k: Key = serde_json::from_str(&key_json).unwrap();
    let key = Base64UrlUnpadded::decode_vec(&k.key).unwrap();
    let iv = Base64UrlUnpadded::decode_vec(&k.nonce).unwrap();

    let dec = Aes256CfbDec::new(
        &GenericArray::clone_from_slice(&key),
        &GenericArray::clone_from_slice(&iv),
    );

    let mut ret = &mut payload.to_owned();
    let _ = dec.decrypt_b2b(payload, &mut ret);
    return ret.to_vec();
}

#[wasm_bindgen]
pub fn generate_aes_256_key() -> String {
    let key: [u8; 32] = rand::random();
    let nonce: [u8; 16] = rand::random();

    let protected = Key {
        enc: "AES-256-CFB".to_string(),
        key: Base64UrlUnpadded::encode_string(&key),
        nonce: Base64UrlUnpadded::encode_string(&nonce),
    };

    return serde_json::to_string(&protected).unwrap();
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
    fn should_do_generate_aes_256_key() {
        println!("{}", generate_aes_256_key())
    }

    #[test]
    fn should_do_aes_256_cfb_encrypt_and_decrypt() {
        let plaintext = "1234567890";
        let key = generate_aes_256_key();

        let encrypted = aes_256_cfb_encrypt(plaintext.as_bytes(), &key);
        println!("{:?}", encrypted);

        let decrypted = aes_256_cfb_decrypt(encrypted.as_slice(), &key);
        println!("{:?}", decrypted);
    }
}

