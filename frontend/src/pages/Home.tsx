import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import { ethers, type BigNumberish } from "ethers";
import { db } from "../utils/db";
import { store } from "../utils/store";
import SendCrypto from "../components/SendCrypto";

type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
};

const RPC_ENDPOINTS = [
  `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
  "https://cloudflare-eth.com",
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

export default function Home(): JSX.Element {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [ethBalance, setEthBalance] = useState<number | undefined>(undefined);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkName] = useState<string>("sepolia");
  const [showSendCrypto, setShowSendCrypto] = useState(false); 

  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const pollRef = useRef<number | null>(null);

  const provider = providerRef.current ?? (providerRef.current = buildProvider());


  const formatEth = (value: BigNumberish) => {
    try {
      const s = ethers.formatEther(value);
      const num = parseFloat(s);
      return Number.isFinite(num) ? num : 0;
    } catch {
      return 0;
    }
  };

  const loadAccountFromDB = useCallback(async () => {
    const acct = await db.accounts.toCollection().first();
    return acct?.address as string | undefined;
  }, []);

  const fetchEthBalance = useCallback(
    async (addr: string) => {
      const bal = await provider.getBalance(addr);
      return formatEth(bal);
    },
    [provider]
  );

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
  ];

  const fetchTokenBalances = useCallback(
    async (addr: string, configuredTokens: TokenInfo[]) => {
      const out: Record<string, string> = {};
      await Promise.all(
        configuredTokens.map(async (t) => {
          try {
            const c = new ethers.Contract(t.address, ERC20_ABI, provider);
            const raw = await c.balanceOf(addr);
            const dec = t.decimals ?? (await c.decimals());
            const human = Number(ethers.formatUnits(raw, dec));
            out[t.address] = human.toString();
          } catch {
            out[t.address] = "0";
          }
        })
      );
      return out;
    },
    [provider]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const addr = await loadAccountFromDB();
      if (!addr) {
        setAddress(undefined);
        setEthBalance(undefined);
        setTokenBalances({});
        setLoading(false);
        return;
      }
      setAddress(addr);
      const [ethBal, tokensConfigured] = await Promise.all([
        fetchEthBalance(addr),
        (async () => {
          try {
            const t = await (db as any).tokens?.toCollection().toArray();
            if (t && t.length)
              return (t as any[]).map((x) => ({
                address: x.address,
                symbol: x.symbol,
                decimals: x.decimals ?? 18,
                name: x.name,
              }));
          } catch {}
          return [] as TokenInfo[];
        })(),
      ]);

      setEthBalance(Number(ethBal));
      setTokens(tokensConfigured);
      if (tokensConfigured.length > 0) {
        const tbal = await fetchTokenBalances(addr, tokensConfigured);
        setTokenBalances(tbal);
      } else {
        setTokenBalances({});
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchEthBalance, fetchTokenBalances, loadAccountFromDB]);

  useEffect(() => {
    refreshAll();
    pollRef.current = window.setInterval(() => {
      refreshAll();
    }, 30000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [refreshAll]);

  useEffect(() => {
    if (!showSendCrypto) {
      refreshAll();
      pollRef.current = window.setInterval(() => {
        refreshAll();
      }, 30000);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      };
    }
  }, [refreshAll, showSendCrypto]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    void navigator.vibrate?.(10);
  };

  const receiveClick = () => {
    if (!address) {
      setError("No account to receive into. Create/import first.");
      return;
    }
    alert(`Receive to: ${address}`);
  };

  
  const openSendCrypto = () => {
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



      <div className="w-full flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-zinc-400">Network</div>
          <div className="text-sm text-zinc-200">{networkName}</div>
        </div>

        <div className="flex justify-between items-baseline gap-4">
          <div className="text-sm text-zinc-400">Address</div>
          <div className="text-xs text-zinc-200 break-all">{address ?? "No account"}</div>
          <button
            onClick={copyAddress}
            className="ml-2 px-2 py-1 bg-gray-700 rounded text-zinc-100 text-xs"
            disabled={!address}
          >
            Copy
          </button>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-zinc-400">ETH Balance</div>
          <div className="font-extrabold text-3xl text-zinc-100">
            {loading ? "..." : ethBalance !== undefined ? ethBalance.toFixed(4) : "—"}
          </div>
        </div>

        {tokens.length > 0 && (
          <div className="w-full mt-2">
            <div className="text-sm text-zinc-400 mb-2">Tokens</div>
            <div className="flex flex-col gap-2">
              {tokens.map((t) => (
                <div key={t.address} className="flex justify-between text-sm text-zinc-200">
                  <div className="flex gap-2 items-center">
                    <div className="font-medium">{t.symbol}</div>
                    <div className="text-xs text-zinc-400">{t.name}</div>
                  </div>
                  <div>{Number(tokenBalances[t.address] ?? 0).toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="w-full text-sm text-red-400 mb-4">{error}</div>}

      <div className="flex gap-6">
        <button
          onClick={openSendCrypto}
          className="bg-gray-700 hover:bg-gray-800 text-zinc-100 px-6 py-2 rounded font-semibold"
          disabled={loading || !address}
        >
          Send Crypto
        </button>
        <button
          onClick={receiveClick}
          className="bg-gray-700 hover:bg-gray-800 text-zinc-100 px-6 py-2 rounded font-semibold"
          disabled={!address}
        >
          Receive Crypto
        </button>
        <button
          onClick={() => refreshAll()}
          className="bg-transparent border border-zinc-700 text-zinc-200 px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

