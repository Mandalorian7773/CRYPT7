use wasm_bindgen::prelude::*;
use bip39::{Mnemonic, Language};
use rand::RngCore;


#[wasm_bindgen]
pub fn Generate_Mnemonic() -> String {


    let mut entropy = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut entropy);

    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy).unwrap();
    mnemonic.to_string()
}



