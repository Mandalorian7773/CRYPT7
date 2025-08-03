import GenerateWallet from '../components/WalletWizard'
import { db } from './../utils/db';
import type { VaultRecord } from './../utils/db';
import {useState, useEffect} from 'react';

function Wallets() {
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [wallets, setWallets] = useState<VaultRecord[]>([]);

  useEffect(() => {
    const loadWallets = async() => {
      const allWallets = await db.wallets.toArray();
      setWallets(allWallets);
    };
    loadWallets();
  }, []);

  const handleWalletGen = (): void => {
    setShowGenerator(true);
  }

  return (
    <div className='h-screen w-full flex justify-center items-center'>
      <div className=''>
        {showGenerator && <GenerateWallet onClose={() => setShowGenerator(false)}/>}     
      </div>
     
      {!showGenerator && 
      <>
      <button className='absolute h-15 w-60 bg-gray-800 hover:bg-gray-900 rounded-xl top-20 right-20' onClick={handleWalletGen}>Create or import a wallet</button>
      <div className='absolute top-30 left-30 grid grid-cols-3 gap-4'>
        {wallets.map((wallet) => (
          <div className='bg-gray-900 h-30 w-80 rounded-xl flex justify-center'>{wallet.id}</div>
        ))}
      </div>
      </>
      
      }
      
    </div>
  )
}

export default Wallets;