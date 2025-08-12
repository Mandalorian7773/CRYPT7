use wasm_bindgen::prelude::*;
use bip39::{Mnemonic, Language};
use ethers_signers::{coins_bip39::English, MnemonicBuilder, Signer};
use ethers_core::utils::hex;
use serde::Serialize;

#[derive(Serialize)]
pub struct Account {
    pub address: String,
    pub private_key: String,
}

#[wasm_bindgen]
pub fn derive_wallet(mnemonic: &str, path: &str) -> Result<JsValue, JsValue> {
    let mnemonic = Mnemonic::parse_in(Language::English, mnemonic).map_err(|e| JsValue::from_str(&e.to_string()))?;

    let wallet = MnemonicBuilder::<English>::default()
        .phrase(mnemonic.to_string().as_str())
        .derivation_path(path)
        .map_err(|e| JsValue::from_str(&e.to_string()))?
        .build()
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let address = wallet.address().to_string();
    let private_key = hex::encode(wallet.signer().to_bytes());

    let account = Account {
        address,
        private_key,
    };

    serde_wasm_bindgen::to_value(&account).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn derive_ethereum_account(mnemonic: &str, index: u32) -> Result<JsValue, JsValue> {
    let path = format!("m/44'/60'/0'/0/{}", index);
    derive_wallet(mnemonic, &path)
}
