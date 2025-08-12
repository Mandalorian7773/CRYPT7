import GenerateWallet from '../components/WalletWizard';
import type { RootState } from '../utils/store';
import { db } from './../utils/db';
import type { VaultRecord, AccountRecord, TransactionRecord } from './../utils/db';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

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
              ? walletAccounts.map(acc => (
                  <div key={acc.id} className="mt-2 p-2 bg-gray-800 rounded">
                    <p className="text-sm text-gray-400">Your ETH Address:</p>
                    <p className="break-words">{acc.address}</p>
                  </div>
                ))
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



