import init, { decryption, derive_ethereum_account } from "../pkg/wallet_rs";
import { db } from "../utils/db";

export async function getPrivateKey(): Promise<string> {
  const password = window.prompt("Enter your wallet password");
  if (!password) throw new Error("Password required");

  await init();

  const vault = await db.wallets.toCollection().first();
  if (!vault) throw new Error("No wallet found");

  const mnemonic = decryption(password, vault.salt, vault.nonce, vault.ciphertext);

  const acct = await db.accounts.toCollection().first();
  const index = typeof acct?.index === "number" ? acct.index : 0;

  const account = derive_ethereum_account(mnemonic, index) as any;
  if (!account.private_key) throw new Error("Failed to derive private key");

  return account.private_key;
}

