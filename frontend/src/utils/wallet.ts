import init, { derive_ethereum_account } from './../pkg/wallet_rs';

export interface DerivedAccount {
  address: string;
  private_key: string;
}

export class WalletDerivationError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WalletDerivationError';
    this.cause = cause;
  }
}

export async function deriveAccount(mnemonic: string, index: number): Promise<DerivedAccount> {
  // Validate inputs
  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new WalletDerivationError('Invalid mnemonic: mnemonic is required');
  }

  const words = mnemonic.trim().split(/\s+/);
  const validWordCounts = [12, 15, 18, 21, 24];
  if (!validWordCounts.includes(words.length)) {
    throw new WalletDerivationError(
      `Invalid mnemonic: expected 12, 15, 18, 21, or 24 words, got ${words.length}`
    );
  }

  if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
    throw new WalletDerivationError('Invalid index: must be a non-negative integer');
  }

  // Initialize WASM module
  try {
    await init();
  } catch (initErr) {
    console.error('WASM initialization error:', initErr);
    throw new WalletDerivationError('Failed to initialize wallet module', initErr);
  }

  // Derive the account
  let account;
  try {
    account = derive_ethereum_account(mnemonic.trim(), index);
  } catch (deriveErr) {
    console.error('Account derivation error:', deriveErr);
    throw new WalletDerivationError('Failed to derive Ethereum account', deriveErr);
  }

  // Validate the result
  if (!account || typeof account !== 'object') {
    throw new WalletDerivationError('Invalid derivation result: no account returned');
  }

  const address = account.address as string;
  const privateKey = account.private_key as string;

  // Debug: log the raw address from WASM
  console.log('WASM returned address:', JSON.stringify(address), 'length:', address?.length);

  // Validate address format (must be exactly 42 characters: 0x + 40 hex chars)
  if (!address || typeof address !== 'string') {
    throw new WalletDerivationError('Invalid derivation result: no address returned');
  }

  // Check for truncated addresses (containing ellipsis)
  if (address.includes('…') || address.includes('...') || address.includes('..')) {
    throw new WalletDerivationError('Invalid derivation result: address appears truncated');
  }

  // Must be exactly 42 characters and valid hex
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new WalletDerivationError(
      `Invalid derivation result: address must be 42 characters (0x + 40 hex chars), got ${address.length} chars`
    );
  }

  if (!privateKey || typeof privateKey !== 'string') {
    throw new WalletDerivationError('Invalid derivation result: invalid private key');
  }

  return {
    address,
    private_key: privateKey
  };
}
