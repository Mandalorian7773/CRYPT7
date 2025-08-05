import GenerateWallet from '../components/WalletWizard'
import type { RootState } from '../utils/store';
import { db } from './../utils/db';
import type { VaultRecord, AccountRecord } from './../utils/db';
import { useState, useEffect } from 'react';
import { useSelector } from "react-redux";

function Wallets() {
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [wallets, setWallets] = useState<VaultRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const isUnlocked = useSelector((state: RootState) => state.wallet.isUnlocked);

  const loadWallets = async () => {
  try {
    const allWallets = await db.wallets.toArray();
    const allAccounts = await db.accounts.toArray();
    setWallets(allWallets);
    setAccounts(allAccounts);
  } catch (error) {
    console.error("Failed to load wallets:", error);
  }
};


  useEffect(() => {
    if (isUnlocked) {
      loadWallets();
    }
  }, [isUnlocked]);

  const handleWalletGen = (): void => {
    setShowGenerator(true);
  };

  return (
    <div className='h-screen w-full flex justify-center items-center'>
      <div>
        {showGenerator && <GenerateWallet onClose={() => setShowGenerator(false)} />}
      </div>

      {!showGenerator && (
        <>
          <button
            className='absolute h-15 w-60 bg-gray-800 hover:bg-gray-900 rounded-xl top-20 right-20 text-white'
            onClick={handleWalletGen}
          >
            Create or import a wallet
          </button>

          <div className='absolute top-30 left-30 grid grid-cols-3 gap-4'>
            {wallets.map((wallet) => {
              const walletAccounts = accounts.filter(acc => acc.vaultId === wallet.id);

              return (
                <div key={wallet.id} className='bg-gray-900 h-auto w-80 rounded-xl p-4 text-white'>
                  <h2 className='text-lg font-bold mb-2'>Wallet {wallet.id}</h2>

                  {walletAccounts.length > 0 ? (
                    walletAccounts.map((acc) => (
                      <div key={acc.id} className="mt-2 p-2 bg-gray-800 rounded">
                        <p className="text-sm text-gray-400">Your ETH Address:</p>
                        <p className="break-words">{acc.address}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No accounts yet</p>
                  )}

                  <button className="mt-3 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded">
                    + Create New Account
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Wallets;
