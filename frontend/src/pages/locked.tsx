import { useDispatch } from "react-redux";
import { unlockWallet } from "../utils/walletLocker";
import { useState, useEffect } from "react";
import { db } from "../utils/db";
import type { VaultRecord } from "../utils/db";
import init, { decryption } from "../pkg/wallet_rs";
import GenerateWallet from "../components/newUser";

const Locker: React.FC = () => {
  const dispatch = useDispatch();
  const [password, setPassword] = useState("");
  const [noWallet, setNoWallet] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const walletData = await db.wallets.toCollection().first();
      if (!walletData) setNoWallet(true);
    })();
  }, []);

  const unlock = async () => {
    setLoading(true);
    try {
      const walletData: VaultRecord | undefined = await db.wallets
        .toCollection()
        .first();
      if (!walletData) throw new Error("No wallet found");

      await init();
      const decrypted = decryption(
        password,
        walletData.salt,
        walletData.nonce,
        walletData.ciphertext
      );

      if (!decrypted || decrypted.trim() === "") {
        throw new Error("Invalid password");
      }

      dispatch(unlockWallet(decrypted)); 
      setPassword("");
    } catch {
      alert("Wrong password, try again!");
    } finally {
      setLoading(false);
    }
  };

  if (noWallet) {
    return <GenerateWallet onClose={() => setNoWallet(false)} />;
  }

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col justify-center items-center gap-10">
      <h1 className="text-white text-4xl font-bold">Locked</h1>
      <p className="text-white text-xl font-bold">Enter your password</p>
      <input
        className="bg-black h-13 w-80 rounded-xl outline-none p-2 text-4xl"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-black h-10 w-20 rounded-xl"
        onClick={unlock}
        disabled={loading}
      >
        {loading ? "Unlocking..." : "Unlock"}
      </button>
    </div>
  );
};

export default Locker;

