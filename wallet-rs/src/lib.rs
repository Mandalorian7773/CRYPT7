use wasm_bindgen::prelude::*;
use bip39::{
    Mnemonic, Language
};
use rand::RngCore;
use rand::rngs::OsRng;
use argon2::{
    password_hash::{SaltString},
    Argon2,
};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize; 
use serde_wasm_bindgen;


#[derive(Serialize)]
struct EncryptionData {
    salt: String,
    nonce: String,
    ciphertext: String,
    argon_version: String,
    argon_params: String,
}

#[derive(Serialize)]
struct EncryptionResult {
    mnemonic: String,
    encrypted_data: EncryptionData
}


#[wasm_bindgen]
pub fn encryption(password: &str) -> Result<JsValue, JsValue> {
    
    let mut entropy = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut entropy);

    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy).map_err(|e| JsValue::from_str(&e.to_string()))?.to_string();

    let salt = SaltString::generate(&mut OsRng);

    let argon2 = Argon2::default();

    let mut key = [0u8; 32];

    argon2.hash_password_into(password.as_bytes(), salt.as_str().as_bytes(), &mut key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let mut nonce_bytes = [0u8; 12];

    OsRng.fill_bytes(&mut nonce_bytes);

    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, mnemonic.as_bytes())
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let encrypted_data = EncryptionData {
            salt: salt.to_string(),
            nonce: STANDARD.encode(nonce_bytes),
            ciphertext: STANDARD.encode(ciphertext),
            argon_version: "0.5.3".to_string(),
            argon_params: "m=4096,t=3,p=1".to_string(), 
        };

    let result = EncryptionResult {
        mnemonic,
        encrypted_data
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))

}



