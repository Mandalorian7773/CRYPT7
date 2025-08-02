export interface VaultRecord {
    id?: number;
    salt: String;
    nonce: String,
    ciphertext: String,
    argon_version: String,
    argon_params: String,
}

const DB_NAME = "CRYPT7VAULT"
const STORE = "secrets"