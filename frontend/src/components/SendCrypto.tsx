import { useState, useCallback, useEffect, useRef } from "react";
import { ethers, type BigNumberish } from "ethers";
import { db } from "../utils/db";
import { WalletService } from "../utils/walletService";


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
  const [ethBalance, setEthBalance] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkName] = useState<string>("sepolia");

  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
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

  useEffect(() => {
    (async () => {
      const addr = await loadAccountFromDB();
      setAddress(addr);
      if (addr) {
        const bal = await fetchEthBalance(addr);
        setEthBalance(bal);
      }
    })();
  }, [fetchEthBalance, loadAccountFromDB]);


  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const sendClick = async () => {
    setError(null);

    if (!address) {
      setError("No sender address available.");
      return;
    }

    if (!recipient || !ethers.isAddress(recipient)) {
      setError("Invalid recipient address.");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Invalid amount.");
      return;
    }

    if (ethBalance !== undefined && Number(amount) > ethBalance) {
      setError("Insufficient balance.");
      return;
    }

    // Securely get the private key ONLY when needed
    const privateKey = await getPrivateKey();
    if (!privateKey) {
      setError("Unable to access private key. Wallet locked?");
      return;
    }

    try {
      setLoading(true);

      const svc = new WalletService(privateKey);

      // Build unsigned transaction request
      const txRequest = {
        to: recipient,
        value: ethers.parseEther(amount),
      };

      // Estimate gas dynamically
      const estimatedGas = await provider.estimateGas({
        ...txRequest,
        from: address,
      });

      const gasLimit = (estimatedGas * 12n) / 10n;


      const txWithGas = {
        ...txRequest,
        gasLimit,
      };

   
      const txResponse = await svc.sendTransaction(txWithGas);

      const url = `https://sepolia.etherscan.io/tx/${txResponse.hash}`;
      window.open(url, "_blank");


      setTimeout(() => {
        (async () => {
          const bal = await fetchEthBalance(address);
          setEthBalance(bal);
        })();
      }, 5000);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-600 p-8 rounded-xl shadow-lg max-w-md w-full flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold text-center mb-6 text-zinc-100">
          Send Crypto
        </h1>

        <div className="text-sm text-zinc-400">Network: {networkName}</div>

        <div className="text-sm text-zinc-400 break-words">
          Your Address:{" "}
          <span className="text-zinc-200 font-mono">{address ?? "No account"}</span>
        </div>

        <div className="text-sm text-zinc-400">
          ETH Balance:{" "}
          <span className="text-zinc-200 font-mono">
            {loading ? "..." : ethBalance !== undefined ? ethBalance.toFixed(4) : "—"}
          </span>
        </div>

        <label className="text-zinc-300 font-semibold">Recipient Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="p-2 rounded bg-gray-700 text-zinc-100 outline-none"
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
        />

        <label className="text-zinc-300 font-semibold">Amount (ETH)</label>
        <input
          type="number"
          step="any"
          placeholder="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2 rounded bg-gray-700 text-zinc-100 outline-none"
          disabled={loading}
        />

        {error && (
          <div className="text-red-500 text-center font-semibold">{error}</div>
        )}

        <button
          onClick={sendClick}
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-900 text-zinc-100 py-3 rounded font-semibold"
        >
          {loading ? "Sending..." : "Send"}
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          className="mt-2 bg-transparent border border-zinc-600 text-zinc-400 py-2 rounded font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SendCrypto;
