import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { db } from "../utils/db";

interface SendCryptoProp {
  onClose: () => void;
  getPrivateKey: () => Promise<string | null>;
}

const RPC_ENDPOINTS = [
  `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
  "https://rpc.sepolia.org",
];

function buildProvider(): ethers.JsonRpcProvider {
  for (const url of RPC_ENDPOINTS) {
    if (!url) continue;
    try {
      return new ethers.JsonRpcProvider(url);
    } catch {
      continue;
    }
  }
  return new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
}

// Validate Ethereum address - checks for proper format and no invalid characters
function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;

  // Check for truncated addresses with ellipsis (…, ..., etc.)
  if (address.includes('…') || address.includes('...') || address.includes('..')) {
    return false;
  }

  // Check for any non-hex characters after 0x
  const cleanAddress = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    return false;
  }

  try {
    // Use ethers to validate checksum if applicable
    ethers.getAddress(cleanAddress);
    return true;
  } catch {
    return false;
  }
}

// Validate amount input
function isValidAmount(amount: string, balance: string | null): { valid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: "Amount is required" };
  }

  const parsed = parseFloat(amount);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, error: "Invalid amount format" };
  }

  if (parsed <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (balance) {
    const balanceNum = parseFloat(balance);
    if (parsed > balanceNum) {
      return { valid: false, error: `Insufficient balance. You have ${balanceNum.toFixed(6)} ETH` };
    }
  }

  return { valid: true };
}

// Format error messages for user display
function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message;

    // Handle specific ethers.js errors
    if (message.includes('INVALID_ARGUMENT') && message.includes('ENS')) {
      return "Invalid address format. Please enter a complete Ethereum address (0x followed by 40 hex characters). Do not use truncated addresses with '...' or '…'.";
    }
    if (message.includes('insufficient funds')) {
      return "Insufficient funds to complete this transaction (including gas fees).";
    }
    if (message.includes('nonce')) {
      return "Transaction nonce error. Please try again.";
    }
    if (message.includes('gas')) {
      return "Gas estimation failed. The transaction may fail or the recipient address may be invalid.";
    }
    if (message.includes('network')) {
      return "Network error. Please check your connection and try again.";
    }
    if (message.includes('rejected') || message.includes('denied')) {
      return "Transaction was cancelled.";
    }

    return message;
  }
  return String(err);
}

const SendCrypto: React.FC<SendCryptoProp> = ({ onClose, getPrivateKey }) => {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("0.01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const loadAccountFromDB = useCallback(async () => {
    try {
      const acct = await db.accounts.toCollection().first();
      const addr = acct?.address as string | undefined;
      // Validate address from database
      if (addr && !isValidEthereumAddress(addr)) {
        console.error("Invalid address found in database:", addr);
        return undefined;
      }
      return addr;
    } catch (err) {
      console.error("Error loading account from DB:", err);
      return undefined;
    }
  }, []);

  const fetchEthBalance = useCallback(async (addr: string) => {
    // Validate address before making RPC call
    if (!isValidEthereumAddress(addr)) {
      console.error("Cannot fetch balance for invalid address:", addr);
      return null;
    }
    try {
      const provider = buildProvider();
      const bal = await provider.getBalance(addr);
      return ethers.formatEther(bal);
    } catch (err) {
      console.error("Error fetching balance:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setBalanceLoading(true);
      try {
        const addr = await loadAccountFromDB();
        if (!mounted) return;

        if (!addr) {
          setError("Invalid wallet address. Please re-import your wallet with your recovery phrase.");
          setBalanceLoading(false);
          return;
        }

        setAddress(addr);
        const bal = await fetchEthBalance(addr);
        if (mounted) {
          setEthBalance(bal);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load account data");
        }
      } finally {
        if (mounted) {
          setBalanceLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [loadAccountFromDB, fetchEthBalance]);

  // Validate recipient address on change
  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    setError(null);

    if (value.trim() === '') {
      setAddressError(null);
      return;
    }

    // Check for common copy-paste issues
    if (value.includes('…') || value.includes('...')) {
      setAddressError("Truncated address detected. Please paste the complete address.");
      return;
    }

    if (!value.startsWith('0x')) {
      setAddressError("Address must start with '0x'");
      return;
    }

    if (value.length !== 42) {
      setAddressError(`Address must be 42 characters (currently ${value.length})`);
      return;
    }

    if (!isValidEthereumAddress(value)) {
      setAddressError("Invalid Ethereum address format");
      return;
    }

    setAddressError(null);
  };

  // Validate amount on change
  const handleAmountChange = (value: string) => {
    setAmount(value);
    setError(null);

    if (value.trim() === '') {
      setAmountError(null);
      return;
    }

    const validation = isValidAmount(value, ethBalance);
    setAmountError(validation.error || null);
  };

  const onSend = async () => {
    // Clear previous errors
    setError(null);

    // Validate recipient
    if (!recipient.trim()) {
      setError("Please enter a recipient address");
      return;
    }

    if (!isValidEthereumAddress(recipient)) {
      setError("Invalid recipient address. Please enter a complete Ethereum address (42 characters starting with 0x).");
      return;
    }

    // Validate amount
    const amountValidation = isValidAmount(amount, ethBalance);
    if (!amountValidation.valid) {
      setError(amountValidation.error || "Invalid amount");
      return;
    }

    try {
      setLoading(true);

      // Get private key
      const pk = await getPrivateKey();
      if (!pk) {
        setError("Failed to unlock wallet. Please try again.");
        return;
      }

      // Normalize the recipient address
      let normalizedRecipient: string;
      try {
        normalizedRecipient = ethers.getAddress(recipient.trim());
      } catch {
        setError("Invalid recipient address format");
        return;
      }

      // Parse amount
      let parsedAmount: bigint;
      try {
        parsedAmount = ethers.parseEther(amount);
      } catch {
        setError("Invalid amount format");
        return;
      }

      // Create provider and wallet
      const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
      const wallet = new ethers.Wallet(pk, provider);

      // Check balance before sending
      const balance = await provider.getBalance(wallet.address);
      if (balance < parsedAmount) {
        setError(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH`);
        return;
      }

      // Send transaction
      const txResponse = await wallet.sendTransaction({
        to: normalizedRecipient,
        value: parsedAmount,
      });

      console.log("TX hash:", txResponse.hash);

      // Record transaction to database
      try {
        const acct = await db.accounts.toCollection().first();
        if (acct?.id) {
          await db.transactions.add({
            accountId: acct.id,
            txHash: txResponse.hash,
            from: wallet.address,
            to: normalizedRecipient,
            value: parsedAmount.toString(),
            amount: parseFloat(amount),
            asset: 'ETH',
            timestamp: Date.now(),
            status: 'pending'
          });
        }
      } catch (dbErr) {
        console.error("Failed to record transaction to DB:", dbErr);
        // Don't fail the whole operation if DB write fails
      }

      // Wait for confirmation
      try {
        await txResponse.wait();

        // Update transaction status
        const acct = await db.accounts.toCollection().first();
        if (acct?.id) {
          const tx = await db.transactions.where('txHash').equals(txResponse.hash).first();
          if (tx?.id) {
            await db.transactions.update(tx.id, { status: 'confirmed' });
          }
        }
      } catch (waitErr) {
        console.error("Transaction confirmation error:", waitErr);
        // Transaction was sent but confirmation failed - still show success
      }

      alert(`Transaction sent successfully!\n\nHash: ${txResponse.hash}`);
      onClose();

    } catch (err) {
      console.error("Send transaction error:", err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = !addressError && !amountError && recipient.trim() !== '' && amount.trim() !== '';

  return (
    <div className="p-4 bg-zinc-900 rounded max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Send ETH</h3>

      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-1">From</label>
        <div className="text-sm text-zinc-300 font-mono break-all">
          {address ?? "Loading..."}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Balance: {balanceLoading ? "Loading..." : ethBalance ? `${parseFloat(ethBalance).toFixed(6)} ETH` : "—"}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-1">To (Recipient Address)</label>
        <input
          value={recipient}
          onChange={(e) => handleRecipientChange(e.target.value)}
          placeholder="0x..."
          className={`w-full p-2 bg-zinc-800 rounded text-sm font-mono ${
            addressError ? 'border border-red-500' : ''
          }`}
          disabled={loading}
        />
        {addressError && (
          <div className="text-xs text-red-400 mt-1">{addressError}</div>
        )}
        <div className="text-xs text-zinc-500 mt-1">
          Enter the complete 42-character Ethereum address
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-1">Amount (ETH)</label>
        <input
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0.01"
          type="text"
          inputMode="decimal"
          className={`w-full p-2 bg-zinc-800 rounded text-sm ${
            amountError ? 'border border-red-500' : ''
          }`}
          disabled={loading}
        />
        {amountError && (
          <div className="text-xs text-red-400 mt-1">{amountError}</div>
        )}
        {ethBalance && !amountError && (
          <button
            type="button"
            onClick={() => handleAmountChange(ethBalance)}
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
            disabled={loading}
          >
            Use max
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onSend}
          disabled={loading || !isFormValid}
          className={`flex-1 py-2 px-4 rounded font-semibold transition-colors ${
            loading || !isFormValid
              ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {loading ? "Sending..." : "Send"}
        </button>
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 bg-transparent border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 rounded font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SendCrypto;
