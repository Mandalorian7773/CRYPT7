import { ethers, type TransactionRequest, type TransactionResponse } from "ethers";
import { db } from "./db";
import init, { decryption } from "../pkg/wallet_rs";

export class WalletService {
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.JsonRpcProvider;
  private isUnlocked = false;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  static async fromVault(password: string, rpcUrl: string): Promise<WalletService> {
    await init();

    const vault = await db.wallets.toCollection().first();
    if (!vault) throw new Error("No wallet found in vault");

    const decrypted = decryption(
      password,
      vault.salt,
      vault.nonce,
      vault.ciphertext
    );

    if (!decrypted || decrypted.trim() === "") {
      throw new Error("Failed to decrypt private key");
    }

    const service = new WalletService(rpcUrl);
    service.wallet = new ethers.Wallet(decrypted, service.provider);
    service.isUnlocked = true;
    return service;
  }

  private requireUnlocked(): ethers.Wallet {
    if (!this.wallet || !this.isUnlocked) {
      throw new Error("Wallet is locked");
    }
    return this.wallet;
  }

  async getAddress(): Promise<string> {
    return this.requireUnlocked().address;
  }

  async getBalance(): Promise<string> {
    const wallet = this.requireUnlocked();
    const balance = await this.provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    return await this.requireUnlocked().sendTransaction(tx);
  }

  lock(): void {
    this.wallet = null;
    this.isUnlocked = false;
  }
}

