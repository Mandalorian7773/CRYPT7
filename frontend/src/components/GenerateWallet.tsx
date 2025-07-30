import {useState} from 'react';
import init, { Generate_Mnemonic } from './../pkg/wallet_rs'

const GenerateWallet: React.FC = () => {
    const [mnemonics, setMnemonics] = useState<string[]>([]);

    const mnemonic = async () => {
        await init()
        let words = Generate_Mnemonic();
        setMnemonics(words.split(' '));
    }
  return (
    <>
     
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-gray-600 p-8 rounded-xl shadow-lg h-90 w-196 flex flex-col">
          <h1 className="text-2xl font-extrabold mb-4">Generate a new Wallet</h1>
            <div className='grid grid-cols-3 gap-2'>
          {mnemonics.map((word, i) => (
            <span key={i} className='text px-2 font-bold text-3xl'>
                {i+1}. {word}
            </span>
          ))}
          </div>
          <button onClick={mnemonic} className='mt-auto bg-gray-800 w-40 p-2 rounded-xl hover:bg-gray-900'>Generate keys</button>
        </div>
      </div>
    </>
  );
};

export default GenerateWallet;
