import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface VaultRecord {
    id?: number;
    salt: string;
    nonce: string;
    ciphertext: string;
    argon_version: string;
    argon_params: string;
    createdAt: number;
}

export interface AccountRecord {
    id?: number;
    vaultId: number;
    address: string;
    index: number;
    createdAt: number;
}

export interface TransactionRecord {
    id?: number
    accountId: number
    txHash: string
    from: string
    to: string
    value: string
    amount: number
    asset: string
    timestamp: number
    status: 'pending' | 'confirmed' | 'failed'
}

export interface TokenRecord {
    id?: number;
    address: string;
    symbol: string;
    decimals: number;
    name?: string;
    vaultId?: number;
}


const DB_NAME = "CRYPT7VAULT";

class WalletDatabase extends Dexie {
    wallets!: Table<VaultRecord>;
    accounts!: Table<AccountRecord>;
    transactions!: Table<TransactionRecord>;
    tokens!: Table<TokenRecord>;

    constructor() {
        super(DB_NAME)
        this.version(2).stores({
            wallets: '++id, createdAt',
            accounts: '++id, vaultId, address, index',
            transactions: '++id, accountId, txHash, timestamp',
            tokens: '++id, address, symbol, vaultId'
        })
    }
}

export const db = new WalletDatabase();
