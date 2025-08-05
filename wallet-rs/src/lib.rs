use wasm_bindgen::prelude::*;
mod encryption;
mod decryption;
mod derivation;

#[wasm_bindgen]
pub fn encryption(password_str: &str) -> Result<JsValue, JsValue> {
    encryption::encrypt(password_str)
}

#[wasm_bindgen]
pub fn decryption(password: &str, salt: &str, nonce: &str, ciphertext: &str) -> Result<String, JsValue>{
    decryption::decrypt(password, salt, nonce, ciphertext)
}






