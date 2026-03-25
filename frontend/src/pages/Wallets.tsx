import GenerateWallet from '../components/WalletWizard';
import type { RootState } from '../utils/store';
import { db } from './../utils/db';
import type { VaultRecord, AccountRecord, TransactionRecord } from './../utils/db';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

// Validate Ethereum address
function isValidEthereumAddress(address: string | undefined): boolean {
  if (!address) return false;
  if (address.includes('…') || address.includes('...') || address.includes('..')) {
    return false;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  return true;
}

function Wallets() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [wallets, setWallets] = useState<VaultRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const isUnlocked = useSelector((state: RootState) => state.wallet.isUnlocked);

  const loadWallets = async () => {
    const allWallets = await db.wallets.toArray();
    const allAccounts = await db.accounts.toArray();
    setWallets(allWallets);
    setAccounts(allAccounts);
    if (allWallets.length > 0 && selectedWalletId === null) {
      setSelectedWalletId(allWallets[0].id ?? null);
    }
  };

  const loadTransactions = async (walletId: number) => {
    const walletAccounts = await db.accounts.where({ vaultId: walletId }).toArray();
    const accountIds = walletAccounts.map(acc => acc.id);
    const txs = await db.transactions.filter(tx => accountIds.includes(tx.accountId)).toArray();
    setTransactions(txs);
  };

  useEffect(() => {
    if (isUnlocked) loadWallets();
  }, [isUnlocked]);

  useEffect(() => {
    if (selectedWalletId !== null) loadTransactions(selectedWalletId);
  }, [selectedWalletId]);

  const handleSelectWallet = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'create') setShowGenerator(true);
    else setSelectedWalletId(Number(e.target.value));
  };

  const deleteCorruptedWallet = async (vaultId: number) => {
    if (confirm("Delete this corrupted wallet? You can re-import using your recovery phrase.")) {
      try {
        await db.accounts.where({ vaultId }).delete();
        await db.wallets.delete(vaultId);
        await loadWallets();
        if (selectedWalletId === vaultId) {
          setSelectedWalletId(null);
        }
      } catch (err) {
        console.error("Error deleting wallet:", err);
        alert("Failed to delete wallet. Please try again.");
      }
    }
  };

  const currentWallet = wallets.find(w => w.id === selectedWalletId);
  const walletAccounts = accounts.filter(acc => acc.vaultId === selectedWalletId);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-start p-6">
      <div className="mb-6">
        <select className="bg-gray-800 text-white px-4 py-2 rounded" value={showGenerator ? 'create' : selectedWalletId ?? ''} onChange={handleSelectWallet}>
          {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>Wallet {wallet.id}</option>)}
          <option value="create">+ Create / Import Wallet</option>
        </select>
      </div>
      {showGenerator ? (
        <GenerateWallet onClose={() => setShowGenerator(false)} />
      ) : currentWallet ? (
        <>
          <div className="bg-gray-900 h-auto w-80 rounded-xl p-4 text-white mb-6">
            <h2 className="text-lg font-bold mb-2">Wallet {currentWallet.id}</h2>
            {walletAccounts.length > 0
              ? walletAccounts.map(acc => {
                  const isValid = isValidEthereumAddress(acc.address);
                  return (
                    <div key={acc.id} className={`mt-2 p-2 rounded ${isValid ? 'bg-gray-800' : 'bg-red-900/30 border border-red-500/50'}`}>
                      <p className="text-sm text-gray-400">Your ETH Address:</p>
                      <p className={`break-words font-mono text-sm ${isValid ? '' : 'text-red-400'}`}>{acc.address}</p>
                      {!isValid && (
                        <div className="mt-2">
                          <p className="text-xs text-red-400 mb-2">Invalid address (truncated or corrupted)</p>
                          <button
                            onClick={() => currentWallet?.id && deleteCorruptedWallet(currentWallet.id)}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                          >
                            Delete & Re-import
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              : <p className="text-gray-400">No accounts yet</p>}
          </div>
          <div className="bg-gray-900 w-80 rounded-xl p-4 text-white">
            <h3 className="text-lg font-bold mb-2">Transaction History</h3>
            {transactions.length > 0
              ? transactions.map((tx, _i) => (
                  <div key={tx.id} className="flex justify-between items-center p-2 border-b border-gray-800">
                    <span className="text-sm">{tx.amount} {tx.asset}</span>
                  </div>
                ))
              : <p className="text-gray-400">No transactions yet</p>}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default Wallets;



