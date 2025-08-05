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
pub fn derive_wallet(mnemonic: &str, path: &str) -> JsValue {

    let _ = Mnemonic::parse_in(Language::English, mnemonic).expect("Invalid Mnemonic");

    let wallet = MnemonicBuilder::<English>::default().phrase(mnemonic).derivation_path(path).unwrap().build().unwrap();

    let address = wallet.address();

    let private_key = hex::encode(wallet.signer().to_bytes());

    let account = Account {
        address: format!("{:?}", address),
        private_key,
    };

    serde_wasm_bindgen::to_value(&account).unwrap()
}

#[wasm_bindgen]
pub fn derive_ethereum_account(mnemonic: &str, index: u32) -> JsValue {

    let path = format!("m/44'/60'/0'/0/{}", index);

    derive_wallet(mnemonic, &path)
}
