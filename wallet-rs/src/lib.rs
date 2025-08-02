use wasm_bindgen::prelude::*;
use bip39::{
    Mnemonic, Language
};
use rand::RngCore;
use argon2::{
    password_hash::{
        rand_core::OsRng, PasswordHash, PasswordVerifier, SaltString}, Argon2}
use aes_gcm::{
    Aes256Gcm, KeyInit, Nonce, aead::{Aead, OsRng},
};
use base64;
use std::str;


#[wasm_bindgen]
pub fn Generate_Mnemonic() -> String {

    let mut entropy = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut entropy);

    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy).unwrap();
    mnemonic.to_string()

}


pub fn encrypt_password(password: &str, mnemonic: &str) -> Result<String, JsValue> {
    
    let salt = SaltString::generate(&mut OsRng);

    let argon2 = Argon2.default();

    let mut key = [0u8; 32]
    argon2.hash_password_into(password.as_bytes(), &salt.as_salt(), &mut key)
        .map_err(|e| JsValue::from_str(&.to_string()))?;

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| JsValue::from_str(&.to_string()))?

    let mut nonce_bytes = [0u8; 12];

    OsRng.fill_bytes(&mut nonce_bytes);

    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, mnemonic.as_bytes())
        .map_err(|e| JsValue::from_str(&.to_string()))?

    let mut combined = Vec::new();
    combined.extend_from_slice(salt.as_str().as_bytes());
    combined.push(b'|');
    combined.extend_from_slice(&nonce_bytes);
    combined.push(b'|');
    combined.extend_from_slice(&ciphertext);

    Ok(base64::encode(combined))

}



