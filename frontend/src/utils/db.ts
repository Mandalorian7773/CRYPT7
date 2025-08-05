import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface VaultRecord {
    id?: number;
    salt: string;
    nonce: string,
    ciphertext: string,
    argon_version: string,
    argon_params: string,
    createdAt: number; 
}

export interface AccountRecord {
    id?: number,
    vaultId: number,
    address: string,
    index: number,
    createdAt: number,
}

const DB_NAME = "CRYPT7VAULT"

class WalletDatabase extends Dexie {
    wallets!: Table<VaultRecord>

    accounts!: Table<AccountRecord>

    constructor() {
        super(DB_NAME);
        this.version(1).stores({
            wallets: '++id, createdAt',
            accounts: '++id, vaultId, address, index'
        })
    }
}

export const db = new WalletDatabase();