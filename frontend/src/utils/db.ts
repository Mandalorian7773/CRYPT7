import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface VaultRecord {
    id?: number;
    salt: string;
    nonce: string,
    ciphertext: string,
    argon_version: string,
    argon_params: string,
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