import init, { decryption, derive_ethereum_account } from "../pkg/wallet_rs";
import { db } from "../utils/db";

export class UnlockError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'UnlockError';
    this.cause = cause;
  }
}

/**
 * Prompts user for password and retrieves the private key by decrypting the vault.
 * @returns The private key as a hex string
 * @throws UnlockError if any step fails
 */
export async function getPrivateKey(): Promise<string> {
  // Prompt for password
  const password = window.prompt("Enter your wallet password to sign this transaction");

  if (!password) {
    throw new UnlockError("Password entry was cancelled");
  }

  if (password.trim() === '') {
    throw new UnlockError("Password cannot be empty");
  }

  // Initialize WASM module
  try {
    await init();
  } catch (initErr) {
    console.error("WASM init error:", initErr);
    throw new UnlockError("Failed to initialize wallet module. Please refresh the page.", initErr);
  }

  // Get vault from database
  let vault;
  try {
    vault = await db.wallets.toCollection().first();
  } catch (dbErr) {
    console.error("Database error:", dbErr);
    throw new UnlockError("Failed to access wallet storage", dbErr);
  }

  if (!vault) {
    throw new UnlockError("No wallet found. Please create or import a wallet first.");
  }

  // Validate vault data
  if (!vault.salt || !vault.nonce || !vault.ciphertext) {
    throw new UnlockError("Wallet data is corrupted or incomplete");
  }

  // Decrypt the mnemonic
  let mnemonic: string;
  try {
    mnemonic = decryption(password, vault.salt, vault.nonce, vault.ciphertext);
  } catch (decryptErr) {
    console.error("Decryption error:", decryptErr);
    throw new UnlockError("Incorrect password. Please try again.", decryptErr);
  }

  if (!mnemonic || mnemonic.trim() === "") {
    throw new UnlockError("Failed to decrypt wallet - invalid password or corrupted data");
  }

  // Get account index
  let acct;
  try {
    acct = await db.accounts.toCollection().first();
  } catch (dbErr) {
    console.error("Database error getting account:", dbErr);
    throw new UnlockError("Failed to access account data", dbErr);
  }

  const index = typeof acct?.index === "number" ? acct.index : 0;

  // Derive the private key
  let account: { private_key?: string };
  try {
    account = derive_ethereum_account(mnemonic, index) as { private_key?: string };
  } catch (deriveErr) {
    console.error("Derivation error:", deriveErr);
    throw new UnlockError("Failed to derive wallet keys", deriveErr);
  }

  if (!account.private_key) {
    throw new UnlockError("Failed to derive private key from wallet");
  }

  return account.private_key;
}

/**
 * Gets private key with a custom password (for programmatic use)
 * @param password The wallet password
 * @returns The private key as a hex string
 */
export async function getPrivateKeyWithPassword(password: string): Promise<string> {
  if (!password || password.trim() === '') {
    throw new UnlockError("Password is required");
  }

  try {
    await init();
  } catch (initErr) {
    throw new UnlockError("Failed to initialize wallet module", initErr);
  }

  const vault = await db.wallets.toCollection().first();
  if (!vault) {
    throw new UnlockError("No wallet found");
  }

  if (!vault.salt || !vault.nonce || !vault.ciphertext) {
    throw new UnlockError("Wallet data is corrupted");
  }

  let mnemonic: string;
  try {
    mnemonic = decryption(password, vault.salt, vault.nonce, vault.ciphertext);
  } catch {
    throw new UnlockError("Incorrect password");
  }

  if (!mnemonic || mnemonic.trim() === "") {
    throw new UnlockError("Failed to decrypt wallet");
  }

  const acct = await db.accounts.toCollection().first();
  const index = typeof acct?.index === "number" ? acct.index : 0;

  const account = derive_ethereum_account(mnemonic, index) as { private_key?: string };
  if (!account.private_key) {
    throw new UnlockError("Failed to derive private key");
  }

  return account.private_key;
}
