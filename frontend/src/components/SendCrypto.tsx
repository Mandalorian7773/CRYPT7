import { useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { db } from "../utils/db";

interface SendCryptoProp {
  onClose: () => void;
  getPrivateKey: () => Promise<string | null>; 
}

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

const SendCrypto: React.FC<SendCryptoProp> = ({ onClose, getPrivateKey }) => {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("0.01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = buildProvider();

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

  useEffect(() => {
    (async () => {
      const addr = await loadAccountFromDB();
      setAddress(addr);
      if (addr) {
        const bal = await fetchEthBalance(addr);
        setEthBalance(bal);
      }
    })();
  }, [loadAccountFromDB, fetchEthBalance]);

  function formatEth(v: bigint) {
    return ethers.formatEther(v);
  }

  
const onSend = async () => {
    try {
      setLoading(true);
      const pk = await getPrivateKey();
      if (!pk) throw new Error("Private key could not be unlocked");
  
      const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
      const wallet = new ethers.Wallet(pk, provider);
  
      const txResponse = await wallet.sendTransaction({
        to: recipient, 
        value: ethers.parseEther(amount),
   
      });
  
      console.log("TX hash:", txResponse.hash);
      await txResponse.wait();
      alert(`Transaction sent: ${txResponse.hash}`);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        alert(`Error sending transaction: ${err.message}`);
      } else {
        alert(`Error sending transaction: ${String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-900 rounded">
      <h3 className="text-lg font-semibold mb-2">Send ETH</h3>
      <div className="mb-2">
        <label className="block text-sm text-zinc-400">From</label>
        <div className="text-sm text-zinc-300">{address ?? "no account"}</div>
        <div className="text-xs text-zinc-500">Balance: {ethBalance ?? "—"}</div>
      </div>
      <div className="mb-2">
        <label className="block text-sm text-zinc-400">To</label>
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full p-2 bg-zinc-800 rounded text-sm" />
      </div>
      <div className="mb-2">
        <label className="block text-sm text-zinc-400">Amount (ETH)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 bg-zinc-800 rounded text-sm" />
      </div>
      {error && <div className="text-sm text-red-400 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button onClick={onSend} disabled={loading} className="bg-indigo-600 text-white py-2 px-4 rounded font-semibold">
          {loading ? "Sending..." : "Send"}
        </button>
        <button onClick={onClose} disabled={loading} className="mt-2 bg-transparent border border-zinc-600 text-zinc-400 py-2 rounded font-semibold">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SendCrypto;

