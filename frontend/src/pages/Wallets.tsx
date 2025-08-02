import GenerateWallet from '../components/WalletWizard'
import { useState } from 'react';

function Wallets() {
  const [showGenerator, setShowGenerator] = useState<boolean>(false);

  const handleWalletGen = (): void => {
    setShowGenerator(true);
  }

  return (
    <div className='h-screen w-full flex justify-center items-center'>
      <div className='flex justify-center align-center'>
        {showGenerator && <GenerateWallet onClose={() => setShowGenerator(false)}/>}
        
      </div>
      {!showGenerator && 
      <button className='h-10 w-60 bg-gray-800 hover:bg-gray-900 rounded-xl' onClick={handleWalletGen}>Create or import a wallet</button>
      }
    </div>
  )
}

export default Wallets;