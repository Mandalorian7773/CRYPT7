import {useState} from 'react';
import init, { encryption } from '../pkg/wallet_rs'
import { motion, AnimatePresence } from "motion/react"
import { db } from "./../utils/db"
import { useDispatch } from "react-redux";
import { unlockWallet } from './../utils/walletLocker.ts';
import { deriveAccount } from '../utils/wallet';

interface GenerateWalletProp {
  onClose: () => void;
}

const GenerateWallet: React.FC<GenerateWalletProp> = ({ onClose }) => {
    const [mnemonics, setMnemonics] = useState<string[]>([]);
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState<string>();
    const [confirmPassword, setConfirmPassword] = useState<string>();
    const dispatch = useDispatch();

    const handleEncryption = async (password: String) => {

      if( !password ||
          password !== confirmPassword || 
          password.length < 8){

        alert("invalid password!")
        return;
      }
        await init()
        let parsedResult = encryption(password as string);
        console.log(parsedResult);
        const index = 0;
        let account = await deriveAccount(parsedResult.mnemonic, index);

        console.log(account.address)

        const walletData = {
          salt: parsedResult.encrypted_data.salt,
          nonce: parsedResult.encrypted_data.nonce,
          ciphertext: parsedResult.encrypted_data.ciphertext,
          argon_version: parsedResult.encrypted_data.argon_version,
          argon_params: parsedResult.encrypted_data.argon_params,
          createdAt: Date.now(),
        };

        try {
          const vaultId = await db.wallets.add(walletData);

          const AccountData = {
            address: account.address,
            index: index,
            vaultId: vaultId,
            createdAt: Date.now(),
        }
        
          await db.accounts.add(AccountData);
          console.log("Data saved!")
        }
        catch {
          console.log("error saving data")
        }
        dispatch(unlockWallet());
        
        setStep(3)     
      setMnemonics(parsedResult.mnemonic.split(' '));
    }
    
  return (
    <>
    <div>
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-gray-600 p-8 rounded-xl shadow-lg h-140 w-120 flex flex-col">
          
          <AnimatePresence mode='wait'>
            {step === 1 && (
              <motion.div className='flex flex-col h-full w-full gap-15'>
                <h1 className="text-2xl font-extrabold mb-15 self-center text-6xl">CRYPT7</h1>
                
                <button onClick={() => setStep(2)} className='bg-gray-800 hover:bg-gray-900 p-3 rounded-xl h-20 font-extrabold text-2xl'>CREATE A NEW WALLET</button>
                <button className='bg-gray-800 hover:bg-gray-900 p-3 rounded-xl h-20 font-extrabold text-2xl'>IMPORT AN EXISTING WALLET</button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div className='flex flex-col h-full w-full gap-5'>
                <h1 className="font-extrabold mb-10 self-center text-6xl">CRYPT7</h1>
                
                <h3 className='text-3xl font-bold'>Set Password</h3>
                <input type='password' value={password || ''} onChange={(e) => {setPassword(e.target.value)}} className='bg-gray-800 h-10 text-xl w-80 font-bold outline-none p-2 rounded'/>
                <h3 className='text-3xl font-bold'>Confirm Password</h3>
                <input
                  type='password'
                  value={confirmPassword || ''}
                  onChange={(e) => { setConfirmPassword(e.target.value) }}
                  className='bg-gray-800 h-10 text-xl w-80 font-bold outline-none p-2 rounded mb-12'
                />
                <button
                  onClick={() => handleEncryption(password || '')}
                  className='bg-gray-800 hover:bg-gray-900 p-3 rounded-xl h-20 font-extrabold text-2xl'
                >
                  Recovery Phrase
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div className='flex flex-col h-full w-full gap-5'>
                <h1 className="text-2xl font-extrabold mb-20 self-center text-6xl">CRYPT7</h1>
                <div className='grid grid-cols-3 gap-2'>
                  {mnemonics.map((word, i) => (
                    <span key={i} className='text px-2 font-bold '>
                      {i+1}. {word}
                    </span>
                  ))}
                </div>
                <div>
                  <button onClick={() => {
                    onClose();
                  }} className='h-10 w-60 bg-gray-800 hover:bg-gray-900 rounded-xl'>
                    lesgo
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
};

export default GenerateWallet;