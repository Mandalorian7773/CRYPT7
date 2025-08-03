import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface VaultRecord {
    id?: number;
    salt: String;
    nonce: String,
    ciphertext: String,
    argon_version: String,
    argon_params: String,
}

const DB_NAME = "CRYPT7VAULT"

class WalletDatabase extends Dexie {
    wallets!: Table<VaultRecord>

    constructor() {
        super(DB_NAME);
        this.version(1).stores({
            wallets: '++id, createdAt'
        })
    }
}

export const db = new WalletDatabase();