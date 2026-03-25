import { useEffect, useState, useCallback, useRef } from "react";
import { ethers, type BigNumberish } from "ethers";
import { db } from "../utils/db";
import SendCrypto from "../components/SendCrypto";
import { getPrivateKey } from "../utils/unlockPk";
import { useLiveQuery } from "dexie-react-hooks";

type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
};

const RPC_ENDPOINTS = [
  `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
  "https://rpc.sepolia.org",
];

// Validate Ethereum address - must be 42 chars, start with 0x, no invalid characters
function isValidEthereumAddress(address: string | undefined): boolean {
  if (!address) return false;
  // Check for truncated addresses with ellipsis
  if (address.includes('…') || address.includes('...') || address.includes('..')) {
    return false;
  }
  // Must be exactly 42 characters (0x + 40 hex chars)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

// Format network errors for user display
function formatNetworkError(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    if (message.includes('ens') || message.includes('disallowed character')) {
      return "Invalid address in wallet data. Please create a new wallet or re-import your recovery phrase.";
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return "Network error. Please check your internet connection.";
    }
    if (message.includes('timeout')) {
      return "Request timed out. Please try again.";
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (message.includes('invalid') && message.includes('response')) {
      return "Invalid response from network. Please try again.";
    }

    return err.message;
  }
  return "An unexpected error occurred";
}

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

export default function Home(): React.ReactElement {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [ethBalance, setEthBalance] = useState<number | undefined>(undefined);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSendCrypto, setShowSendCrypto] = useState(false);
  const [copied, setCopied] = useState(false);

  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const pollRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const accounts = useLiveQuery(() => db.accounts.toArray(), []);

  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = buildProvider();
    }
    return providerRef.current;
  }, []);

  const formatEth = useCallback((value: BigNumberish): number => {
    try {
      const s = ethers.formatEther(value);
      const num = parseFloat(s);
      return Number.isFinite(num) ? num : 0;
    } catch (err) {
      console.error("Error formatting ETH value:", err);
      return 0;
    }
  }, []);

  const loadAccountFromDB = useCallback(async (): Promise<string | undefined> => {
    try {
      if (selectedAccountId && accounts) {
        const acct = accounts.find((a) => a.id === selectedAccountId);
        const addr = acct?.address;
        // Validate address before returning
        if (addr && !isValidEthereumAddress(addr)) {
          console.error("Invalid address found in database:", addr);
          return undefined;
        }
        return addr;
      }

      const acct = await db.accounts.toCollection().first();
      if (acct && mountedRef.current) {
        setSelectedAccountId(acct.id);
      }
      const addr = acct?.address;
      // Validate address before returning
      if (addr && !isValidEthereumAddress(addr)) {
        console.error("Invalid address found in database:", addr);
        return undefined;
      }
      return addr;
    } catch (err) {
      console.error("Error loading account from DB:", err);
      return undefined;
    }
  }, [selectedAccountId, accounts]);

  const fetchEthBalance = useCallback(
    async (addr: string): Promise<number> => {
      // Validate address before making RPC call
      if (!isValidEthereumAddress(addr)) {
        console.error("Cannot fetch balance for invalid address:", addr);
        throw new Error("Invalid wallet address. Please re-import your wallet.");
      }
      try {
        const provider = getProvider();
        const bal = await provider.getBalance(addr);
        return formatEth(bal);
      } catch (err) {
        console.error("Error fetching ETH balance:", err);
        throw err;
      }
    },
    [getProvider, formatEth]
  );

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
  ];

  const fetchTokenBalances = useCallback(
    async (addr: string, configuredTokens: TokenInfo[]): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      const provider = getProvider();

      await Promise.all(
        configuredTokens.map(async (t) => {
          try {
            // Validate token address
            if (!t.address || !ethers.isAddress(t.address)) {
              out[t.address] = "0";
              return;
            }

            const c = new ethers.Contract(t.address, ERC20_ABI, provider);
            const raw = await c.balanceOf(addr);
            const dec = t.decimals ?? (await c.decimals());
            const human = Number(ethers.formatUnits(raw, dec));
            out[t.address] = human.toString();
          } catch (err) {
            console.error(`Error fetching balance for token ${t.symbol}:`, err);
            out[t.address] = "0";
          }
        })
      );
      return out;
    },
    [getProvider]
  );

  const refreshAll = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const addr = await loadAccountFromDB();

      if (!mountedRef.current) return;

      if (!addr) {
        setAddress(undefined);
        setEthBalance(undefined);
        setTokenBalances({});
        setError("No valid wallet address found. The stored address may be corrupted. Please create a new wallet or re-import your recovery phrase.");
        setLoading(false);
        return;
      }

      // Double-check address validity before proceeding
      if (!isValidEthereumAddress(addr)) {
        setAddress(addr); // Show the corrupted address for debugging
        setEthBalance(undefined);
        setTokenBalances({});
        setError("Invalid wallet address detected (address contains invalid characters). Please create a new wallet or re-import your recovery phrase from the Wallets page.");
        setLoading(false);
        return;
      }

      setAddress(addr);

      // Fetch ETH balance and tokens in parallel
      const [ethBal, tokensConfigured] = await Promise.all([
        fetchEthBalance(addr).catch((err) => {
          console.error("Failed to fetch ETH balance:", err);
          return undefined;
        }),
        (async () => {
          try {
            const t = await db.tokens?.toCollection().toArray();
            if (t && t.length) {
              return t.map((x) => ({
                address: x.address,
                symbol: x.symbol,
                decimals: x.decimals ?? 18,
                name: x.name,
              }));
            }
          } catch (err) {
            console.error("Error loading tokens:", err);
          }
          return [] as TokenInfo[];
        })(),
      ]);

      if (!mountedRef.current) return;

      if (ethBal !== undefined) {
        setEthBalance(Number(ethBal));
      }

      setTokens(tokensConfigured);

      if (tokensConfigured.length > 0) {
        try {
          const tbal = await fetchTokenBalances(addr, tokensConfigured);
          if (mountedRef.current) {
            setTokenBalances(tbal);
          }
        } catch (err) {
          console.error("Error fetching token balances:", err);
        }
      } else {
        setTokenBalances({});
      }

    } catch (err) {
      console.error("Error refreshing data:", err);
      if (mountedRef.current) {
        setError(formatNetworkError(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchEthBalance, fetchTokenBalances, loadAccountFromDB]);

  // Initial load and polling
  useEffect(() => {
    mountedRef.current = true;
    refreshAll();

    pollRef.current = window.setInterval(() => {
      if (mountedRef.current) {
        refreshAll();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [refreshAll]);

  const copyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      void navigator.vibrate?.(10);
    } catch (err) {
      console.error("Failed to copy address:", err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearCorruptedWallet = async () => {
    if (confirm("This will delete all wallet data. You will need to re-import your wallet using your recovery phrase. Continue?")) {
      try {
        await db.wallets.clear();
        await db.accounts.clear();
        await db.transactions.clear();
        window.location.reload();
      } catch (err) {
        console.error("Error clearing wallet:", err);
        alert("Failed to clear wallet data. Please try refreshing the page.");
      }
    }
  };

  const receiveClick = () => {
    if (!address) {
      setError("No account to receive into. Create/import first.");
      return;
    }
    // Show receive modal with QR code (simplified for now)
    alert(`Receive ETH on Sepolia testnet:\n\n${address}\n\n(Address copied to clipboard)`);
    copyAddress();
  };

  const openSendCrypto = () => {
    setError(null);
    setShowSendCrypto(true);
  };

  const closeSendCrypto = () => {
    setShowSendCrypto(false);
    refreshAll();
  };

  if (showSendCrypto) {
    return <SendCrypto onClose={closeSendCrypto} getPrivateKey={getPrivateKey} />;
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-zinc-100">Account Balances</h1>

      {/* Account selector */}
      {accounts && accounts.length > 0 && (
        <div className="mb-4 w-full">
          <label className="block text-sm text-zinc-400 mb-1">Select Account</label>
          <select
            className="bg-gray-800 text-white px-4 py-2 rounded w-full cursor-pointer"
            value={selectedAccountId ?? ""}
            onChange={(e) => {
              setSelectedAccountId(Number(e.target.value));
              setError(null);
            }}
          >
            {accounts.map((acc, index) => (
              <option key={acc.id ?? index} value={acc.id ?? ""}>
                {`Wallet ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="w-full flex flex-col gap-4 mb-6">
        {/* Network */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-zinc-400">Network</div>
          <div className="text-sm text-zinc-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Sepolia Testnet
          </div>
        </div>

        {/* Address */}
        <div className="flex justify-between items-baseline gap-4">
          <div className="text-sm text-zinc-400">Address</div>
          <div className="text-xs text-zinc-200 break-all font-mono flex-1 text-right">
            {address ?? "No account"}
          </div>
          <button
            onClick={copyAddress}
            className={`ml-2 px-2 py-1 rounded text-xs transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-zinc-100'
            }`}
            disabled={!address}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* ETH Balance */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-zinc-400">ETH Balance</div>
          <div className="font-extrabold text-3xl text-zinc-100">
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : ethBalance !== undefined ? (
              `${ethBalance.toFixed(4)} ETH`
            ) : (
              "—"
            )}
          </div>
        </div>

        {/* Tokens */}
        {tokens.length > 0 && (
          <div className="w-full mt-2">
            <div className="text-sm text-zinc-400 mb-2">Tokens</div>
            <div className="flex flex-col gap-2">
              {tokens.map((t) => (
                <div key={t.address} className="flex justify-between text-sm text-zinc-200">
                  <div className="flex gap-2 items-center">
                    <div className="font-medium">{t.symbol}</div>
                    {t.name && <div className="text-xs text-zinc-400">{t.name}</div>}
                  </div>
                  <div>{Number(tokenBalances[t.address] ?? 0).toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="w-full bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => {
                setError(null);
                refreshAll();
              }}
              className="text-xs text-red-300 hover:text-red-200 underline"
            >
              Dismiss and retry
            </button>
            {error.includes('Invalid') && error.includes('address') && (
              <button
                onClick={clearCorruptedWallet}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
              >
                Clear Wallet & Re-import
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={openSendCrypto}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !address}
        >
          Send
        </button>
        <button
          onClick={receiveClick}
          className="bg-gray-700 hover:bg-gray-600 text-zinc-100 px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!address}
        >
          Receive
        </button>
        <button
          onClick={() => refreshAll()}
          className="bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-4 py-2 rounded transition-colors"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
