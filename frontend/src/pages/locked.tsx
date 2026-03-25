import { useDispatch } from "react-redux";
import { unlockWallet } from "../utils/walletLocker";
import { useState, useEffect } from "react";
import { db } from "../utils/db";
import type { VaultRecord } from "../utils/db";
import init, { decryption, derive_ethereum_account } from "../pkg/wallet_rs";
import GenerateWallet from "../components/newUser";

// Format error messages for user display
function formatUnlockError(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    if (message.includes('password') || message.includes('decrypt')) {
      return "Incorrect password. Please try again.";
    }
    if (message.includes('wallet') || message.includes('vault')) {
      return "No wallet found. Please create or import a wallet.";
    }
    if (message.includes('derive') || message.includes('key')) {
      return "Failed to derive wallet keys. The wallet data may be corrupted.";
    }
    if (message.includes('wasm') || message.includes('init')) {
      return "Failed to initialize wallet module. Please refresh the page.";
    }

    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}

const Locker: React.FC = () => {
  const dispatch = useDispatch();
  const [password, setPassword] = useState("");
  const [noWallet, setNoWallet] = useState(false);
  const [showCreateImport, setShowCreateImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletExists, setWalletExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkWallet = async () => {
      try {
        const walletData = await db.wallets.toCollection().first();
        if (!mounted) return;

        if (!walletData) {
          setNoWallet(true);
        } else {
          setWalletExists(true);
        }
      } catch (err) {
        console.error("Error checking wallet:", err);
        if (mounted) {
          setError("Failed to access wallet storage. Please refresh the page.");
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    checkWallet();
    return () => { mounted = false; };
  }, []);

  const unlock = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Get wallet data
      const walletData: VaultRecord | undefined = await db.wallets
        .toCollection()
        .first();

      if (!walletData) {
        throw new Error("No wallet found in storage");
      }

      // Validate wallet data integrity
      if (!walletData.salt || !walletData.nonce || !walletData.ciphertext) {
        throw new Error("Wallet data is corrupted or incomplete");
      }

      // Initialize WASM module
      try {
        await init();
      } catch (initErr) {
        console.error("WASM init error:", initErr);
        throw new Error("Failed to initialize wallet module");
      }

      // Decrypt the mnemonic
      let mnemonic: string;
      try {
        mnemonic = decryption(
          password,
          walletData.salt,
          walletData.nonce,
          walletData.ciphertext
        );
      } catch (decryptErr) {
        console.error("Decryption error:", decryptErr);
        throw new Error("Incorrect password or corrupted wallet data");
      }

      if (!mnemonic || mnemonic.trim() === "") {
        throw new Error("Failed to decrypt wallet - incorrect password");
      }

      // Get the account index
      const acct = await db.accounts.toCollection().first();
      const index = typeof acct?.index === "number" ? acct.index : 0;

      // Derive the private key
      let account: { private_key: string };
      try {
        account = derive_ethereum_account(mnemonic, index) as { private_key: string };
      } catch (deriveErr) {
        console.error("Derivation error:", deriveErr);
        throw new Error("Failed to derive wallet keys");
      }

      if (!account.private_key) {
        throw new Error("Failed to derive private key from mnemonic");
      }

      // Unlock the wallet
      dispatch(unlockWallet(account.private_key));
      setPassword("");

    } catch (err) {
      console.error("Unlock error:", err);
      setError(formatUnlockError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      unlock();
    }
  };

  // Show loading while initializing
  if (initializing) {
    return (
      <div className="h-screen w-full bg-gray-900 flex flex-col justify-center items-center">
        <div className="text-white text-xl">Loading wallet...</div>
      </div>
    );
  }

  if (noWallet || showCreateImport) {
    return (
      <GenerateWallet
        onClose={() => {
          setNoWallet(false);
          setShowCreateImport(false);
          // Re-check if wallet was created
          db.wallets.toCollection().first().then((wallet) => {
            if (wallet) {
              setWalletExists(true);
            }
          }).catch(console.error);
        }}
      />
    );
  }

  if (walletExists && !showCreateImport) {
    return (
      <div className="h-screen w-full bg-gray-900 flex flex-col justify-center items-center gap-6">
        <h1 className="text-white text-4xl font-bold">CRYPT7</h1>
        <p className="text-zinc-400 text-sm">Non-custodial Ethereum Wallet</p>
        <button
          className="bg-gray-600 hover:bg-gray-500 text-white py-3 px-8 rounded-xl font-semibold transition-colors"
          onClick={() => setWalletExists(false)}
        >
          Unlock Existing Wallet
        </button>
        <button
          className="bg-transparent border border-gray-600 hover:border-gray-400 text-white py-2 px-6 rounded-xl font-semibold transition-colors"
          onClick={() => setShowCreateImport(true)}
        >
          Create / Import Another Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col justify-center items-center gap-8">
      <h1 className="text-white text-4xl font-bold">Unlock Wallet</h1>
      <p className="text-zinc-400 text-sm">Enter your password to continue</p>

      <div className="w-80 flex flex-col gap-4">
        <input
          className={`bg-black h-14 w-full rounded-xl outline-none p-4 text-xl text-white placeholder-zinc-600 ${
            error ? 'border border-red-500' : 'border border-transparent focus:border-zinc-600'
          }`}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          placeholder="Enter password"
          disabled={loading}
          autoFocus
        />

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <button
          className={`h-12 w-full rounded-xl font-semibold transition-colors ${
            loading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          onClick={unlock}
          disabled={loading}
        >
          {loading ? "Unlocking..." : "Unlock"}
        </button>
      </div>

      <button
        className="text-zinc-500 hover:text-zinc-300 text-sm mt-4 transition-colors"
        onClick={() => setShowCreateImport(true)}
        disabled={loading}
      >
        Use a different wallet
      </button>
    </div>
  );
};

export default Locker;
