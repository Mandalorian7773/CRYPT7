use argon2::Argon2;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use wasm_bindgen::JsValue;


pub fn decrypt(password_str: &str, salt_str: &str, nonce_str: &str, ciphertext_str: &str) -> Result<String, JsValue> {

    let nonce_bytes = STANDARD.decode(nonce_str).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let ciphertext_bytes = STANDARD.decode(ciphertext_str).map_err(|e| JsValue::from_str(&e.to_string()))?;

    let argon2 = Argon2::default();

    let mut key = [0u8; 32];

    argon2.hash_password_into(password_str.as_bytes(), salt_str.as_bytes(), &mut key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let nonce_obj = Nonce::from_slice(&nonce_bytes);

    let decoded_text = cipher.decrypt(nonce_obj, ciphertext_bytes.as_ref()).map_err(|e| JsValue::from_str(&e.to_string()))?;

    String::from_utf8(decoded_text).map_err(|e| JsValue::from_str(&e.to_string()))

}


