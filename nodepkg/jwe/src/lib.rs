use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use rsa::{RsaPublicKey, BigUint, Oaep};
use sha1::Sha1;
use base64ct::{Encoding, Base64, Base64UrlUnpadded};
use aes_gcm::{
    aead::{
        heapless::Vec,
        AeadCore, AeadInPlace, KeyInit, OsRng,
    },
    Aes256Gcm,
};

#[derive(Serialize, Deserialize)]
struct JWK {
    alg: String,
    kid: String,
    kty: String,
    n: String,
    e: String,
}

#[derive(Serialize, Deserialize)]
struct JWEHeader {
    alg: String,
    kid: String,
    enc: String,
}

struct JWEEncoder {
    protected: JWEHeader,
    key: rsa::RsaPublicKey,
    aad: Option<String>,
}

impl JWEEncoder {
    pub fn encode_string(&self, payload: &[u8]) -> String {
        let key = Aes256Gcm::generate_key(&mut OsRng);
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let aad = self.additional_data();

        let mut buf: Vec<u8, 128> = Vec::new();
        let _ = buf.extend_from_slice(payload);

        let cipher = Aes256Gcm::new(&key);
        cipher.encrypt_in_place(&nonce, aad.as_bytes(), &mut buf).unwrap();

        let (ciphertext, tag) = buf.split_at(buf.len() - 16);

        return format!(
            "{}.{}.{}.{}.{}",
            self.protected_header(),
            self.encrypted_key(&key),
            Base64UrlUnpadded::encode_string(nonce.as_slice()),
            Base64UrlUnpadded::encode_string(ciphertext),
            Base64UrlUnpadded::encode_string(tag),
        );
    }

    fn encrypted_key(&self, key: &[u8]) -> String {
        // RSA-OAEP use Sha1
        // RSA-OAEP-256 use Sha256
        let padding = Oaep::new::<Sha1>();
        let encrypted_data = self.key.encrypt(&mut OsRng, padding, key).unwrap();
        return Base64UrlUnpadded::encode_string(&encrypted_data);
    }

    fn additional_data(&self) -> String {
        match &self.aad {
            Some(aad) => format!("{}.{}", self.protected_header(), Base64UrlUnpadded::encode_string(aad.as_bytes())),
            None => self.protected_header()
        }
    }

    fn protected_header(&self) -> String {
        return Base64UrlUnpadded::encode_string(serde_json::to_string(&self.protected).unwrap().as_bytes());
    }
}

#[wasm_bindgen]
pub fn encrypt(payload: &str, jwk_json: &str) -> String {
    let jwk: JWK = serde_json::from_str(&jwk_json).unwrap();

    let n = Base64UrlUnpadded::decode_vec(&jwk.n).unwrap();
    let e = Base64::decode_vec(&jwk.e).unwrap();
    let key = RsaPublicKey::new(BigUint::from_bytes_be(&n), BigUint::from_bytes_be(&e)).unwrap();

    let enc = JWEEncoder {
        protected: JWEHeader {
            alg: String::from("RSA-OAEP"),
            enc: String::from("A256GCM"),
            kid: jwk.kid,
        },
        key,
        aad: Option::None,
    };

    return enc.encode_string(payload.as_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_encrypt() {
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

        println!("{}", encrypt(payload, key))
    }
}

