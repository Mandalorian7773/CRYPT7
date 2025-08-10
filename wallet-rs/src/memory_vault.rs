use once_cell::sync::Lazy;
use std::sync::Mutex;
use zeroize::Zeroize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use hex;
use ethers_core::types::transaction::eip2718::TypedTransaction;
use ethers_core::types::{TransactionRequest, Eip1559TransactionRequest, NameOrAddress, U256, Address};
use ethers_signers::{LocalWallet, Signer};
use serde::Deserialize;
use serde_json;

static VAULT: Lazy<Mutex<Option<Vec<u8>>>> = Lazy::new(|| Mutex::new(None));

fn store_key_bytes(bytes: Vec<u8>) {
    if let Ok(mut guard) = VAULT.lock() {
        if let Some(mut prev) = guard.take() {
            prev.zeroize();
        }
        *guard = Some(bytes);
    }
}

fn take_key_bytes() -> Option<Vec<u8>> {
    if let Ok(mut guard) = VAULT.lock() {
        guard.take()
    } else {
        None
    }
}

fn peek_key_bytes() -> Option<Vec<u8>> {
    VAULT.lock().ok().and_then(|g| g.as_ref().cloned())
}

#[wasm_bindgen]
pub fn unlock_vault_from_private_key_hex(pk_hex: &str) -> Result<(), JsValue> {
    let s = pk_hex.strip_prefix("0x").unwrap_or(pk_hex);
    let bytes = hex::decode(s).map_err(|e| JsValue::from_str(&format!("hex decode: {}", e)))?;
    store_key_bytes(bytes);
    Ok(())
}

#[wasm_bindgen]
pub fn unlock_vault_from_blob(password: &str, salt: &str, nonce: &str, ciphertext: &str) -> Result<(), JsValue> {
    let pk_hex = crate::decryption::decrypt(password, salt, nonce, ciphertext)?;
    unlock_vault_from_private_key_hex(&pk_hex)
}

#[wasm_bindgen]
pub fn lock_vault() -> Result<(), JsValue> {
    if let Some(mut bytes) = take_key_bytes() {
        bytes.zeroize();
    }
    Ok(())
}

#[wasm_bindgen]
pub fn is_vault_unlocked() -> bool {
    VAULT.lock().ok().and_then(|g| g.as_ref().cloned()).is_some()
}

#[wasm_bindgen]
pub async fn sign_message_hex(data_hex: &str) -> Result<String, JsValue> {
    let key_bytes = peek_key_bytes().ok_or_else(|| JsValue::from_str("vault locked"))?;
    let pk_hex = format!("0x{}", hex::encode(&key_bytes));
    let wallet: LocalWallet = pk_hex.parse().map_err(|e| JsValue::from_str(&format!("wallet parse: {}", e)))?;
    let s = data_hex.strip_prefix("0x").unwrap_or(data_hex);
    let data = hex::decode(s).map_err(|e| JsValue::from_str(&format!("hex decode: {}", e)))?;
    let sig = wallet.sign_message(&data).await.map_err(|e| JsValue::from_str(&format!("sign: {}", e)))?;
    Ok(sig.to_string())
}

#[derive(Deserialize)]
struct TxPayload {
    to: Option<String>,
    value: Option<String>,
    nonce: Option<u64>,
    gas_limit: Option<String>,
    gas_price: Option<String>,
    max_fee_per_gas: Option<String>,
    max_priority_fee_per_gas: Option<String>,
    chain_id: Option<u64>,
    data: Option<String>,
}

fn parse_u256_string(s: &str) -> Result<U256, JsValue> {
    let s = s.trim();
    if s.starts_with("0x") {
        let no = &s[2..];
        U256::from_str_radix(no, 16).map_err(|e| JsValue::from_str(&format!("u256 parse hex: {}", e)))
    } else if s.chars().all(|c| c.is_digit(10)) {
        U256::from_dec_str(s).map_err(|e| JsValue::from_str(&format!("u256 parse dec: {}", e)))
    } else {
        Err(JsValue::from_str("invalid u256 string"))
    }
}

fn parse_eth_value_string(s: &str) -> Result<U256, JsValue> {
    let s = s.trim();
    if s.starts_with("0x") {
        return parse_u256_string(s);
    }
    let f: f64 = s.parse().map_err(|e| JsValue::from_str(&format!("value parse: {}", e)))?;
    let wei = (f * 1e18).round() as u128;
    Ok(U256::from(wei))
}

#[wasm_bindgen]
pub fn signature_to_bytes(r: &[u8], s: &[u8], v: u8) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(65);
    bytes.extend_from_slice(r);
    bytes.extend_from_slice(s);
    bytes.push(v);
    bytes
}

#[wasm_bindgen]
pub async fn sign_transaction(tx_json: &str) -> Result<String, JsValue> {
    let key_bytes = peek_key_bytes().ok_or_else(|| JsValue::from_str("vault locked"))?;
    let pk_hex = format!("0x{}", hex::encode(&key_bytes));
    let wallet: LocalWallet = pk_hex.parse().map_err(|e| JsValue::from_str(&format!("wallet parse: {}", e)))?;
    let payload: TxPayload = serde_json::from_str(tx_json).map_err(|e| JsValue::from_str(&format!("tx json parse: {}", e)))?;
    let mut tx: TypedTransaction = if payload.max_fee_per_gas.is_some() || payload.max_priority_fee_per_gas.is_some() {
        let mut eip = Eip1559TransactionRequest::default();
        if let Some(to) = payload.to {
            let addr: Address = to.parse().map_err(|e| JsValue::from_str(&format!("to parse: {}", e)))?;
            eip.to = Some(NameOrAddress::from(addr));
        }
        if let Some(v) = payload.value {
            eip.value = Some(parse_eth_value_string(&v)?);
        }
        if let Some(g) = payload.gas_limit {
            eip.gas = Some(parse_u256_string(&g)?);
        }
        if let Some(max_fee) = payload.max_fee_per_gas {
            eip.max_fee_per_gas = Some(parse_u256_string(&max_fee)?);
        }
        if let Some(max_priority) = payload.max_priority_fee_per_gas {
            eip.max_priority_fee_per_gas = Some(parse_u256_string(&max_priority)?);
        }
        if let Some(d) = payload.data {
            let s = d.strip_prefix("0x").unwrap_or(&d);
            eip.data = Some(hex::decode(s).map_err(|e| JsValue::from_str(&format!("data hex: {}", e)))?.into());
        }
        TypedTransaction::Eip1559(eip.into())
    } else {
        let mut legacy: TransactionRequest = TransactionRequest::default();
        if let Some(to) = payload.to {
            let addr: Address = to.parse().map_err(|e| JsValue::from_str(&format!("to parse: {}", e)))?;
            legacy.to = Some(NameOrAddress::from(addr));
        }
        if let Some(v) = payload.value {
            legacy.value = Some(parse_eth_value_string(&v)?);
        }
        if let Some(g) = payload.gas_limit {
            legacy.gas = Some(parse_u256_string(&g)?);
        }
        if let Some(gp) = payload.gas_price {
            legacy.gas_price = Some(parse_u256_string(&gp)?);
        }
        if let Some(d) = payload.data {
            let s = d.strip_prefix("0x").unwrap_or(&d);
            legacy.data = Some(hex::decode(s).map_err(|e| JsValue::from_str(&format!("data hex: {}", e)))?.into());
        }
        TypedTransaction::Legacy(legacy)
    };
    if let Some(n) = payload.nonce {
        tx.set_nonce(U256::from(n));
    }
    if let Some(chain_id) = payload.chain_id {
        tx.set_chain_id(chain_id);
    }

    let sig = wallet.sign_transaction(&tx).await.map_err(|e| JsValue::from_str(&format!("sign tx: {}", e)))?;
    let signed_tx = tx.rlp_signed(&sig);
    Ok(format!("0x{}", hex::encode(signed_tx)))
}





