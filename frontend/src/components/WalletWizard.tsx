import { useState } from 'react';
import init, { encryption, import_wallet } from '../pkg/wallet_rs';
import { motion, AnimatePresence } from "motion/react";
import { db } from "./../utils/db";
import { useDispatch } from "react-redux";
import { unlockWallet } from './../utils/walletLocker.ts';
import { deriveAccount } from '../utils/wallet';

interface GenerateWalletProp { onClose: () => void; }

const GenerateWallet: React.FC<GenerateWalletProp> = ({ onClose }) => {
  const [mnemonics, setMnemonics] = useState<string[]>(Array(12).fill(''));
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isImport, setIsImport] = useState(false);
  const [mnemonicCount, setMnemonicCount] = useState(12);
  const dispatch = useDispatch();

  const handleMnemonicChange = (index: number, value: string) => {
    const newMnemonics = [...mnemonics];
    newMnemonics[index] = value.trim().toLowerCase();
    setMnemonics(newMnemonics);

  };

  const validateMnemonicCount = (words: string[]) => {
    const validCounts = [12, 15, 18, 21, 24];
    return validCounts.includes(words.length);
  };

  const handleEncrypt = async () => {
    if (!password || password !== confirmPassword || password.length < 8) {
      alert("Invalid password or passwords do not match!");
      return;
    }
    await init();

    let mnemonicStr = mnemonics.join(' ').trim();
    let parsedResult;

    if (isImport) {
      const words = mnemonics.slice(0, mnemonicCount).map(w => (w || '').trim()).filter(Boolean);
      if (!validateMnemonicCount(words)) {
        alert(`Mnemonic has invalid word count: ${words.length}. Must be 12, 15, 18, 21, or 24.`);
        setStep(2);
        return;
      }
      const normalized = words.join(' ');
      try {
        parsedResult = await import_wallet(normalized, password);
      } catch (e) {
        alert("Failed to import wallet. Check your mnemonic and try again.");
        console.error(e);
        setStep(2);
        return;
      }
    }
     else {
      try {
        parsedResult = await encryption(password);
        mnemonicStr = parsedResult.mnemonic;
        setMnemonics(mnemonicStr.split(' '));
      } catch (e) {
        alert("Failed to create wallet.");
        console.error(e);
        return;
      }
    }

    if (!parsedResult?.encrypted_data) {
      alert("Something went wrong during encryption/import.");
      return;
    }

    try {
      const index = 0;
      let account = await deriveAccount(mnemonicStr, index);
      const walletData = {
        salt: parsedResult.encrypted_data.salt,
        nonce: parsedResult.encrypted_data.nonce,
        ciphertext: parsedResult.encrypted_data.ciphertext,
        argon_version: parsedResult.encrypted_data.argon_version,
        argon_params: parsedResult.encrypted_data.argon_params,
        createdAt: Date.now(),
      };

      const vaultId = await db.wallets.add(walletData);
      await db.accounts.add({ address: account.address, index, vaultId, createdAt: Date.now() });
      dispatch(unlockWallet(account.private_key));
      setStep(4);
    } catch (e) {
      alert("Failed to save wallet data locally.");
      console.error(e);
    }
  };

  const renderMnemonicInputs = () => (
    <div className="grid grid-cols-4 gap-4 max-w-full overflow-x-hidden">
      {Array(mnemonicCount).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <label className="mb-1 text-white font-semibold">{i + 1}</label>
          <input
            type="text"
            value={mnemonics[i] || ''}
            onChange={e => handleMnemonicChange(i, e.target.value)}
            className="bg-gray-800 text-white p-2 rounded outline-none text-center font-semibold text-xl w-full max-w-[12rem]"
            maxLength={15}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Mnemonic word ${i + 1}`}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-600 p-8 rounded-xl shadow-lg h-[700px] w-[480px] flex flex-col">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div className="flex flex-col h-full w-full gap-12">
              <h1 className="text-6xl font-extrabold self-center mb-12">CRYPT7</h1>
              <button onClick={onClose} className="absolute top-5 right-5 bg-gray-900 h-10 w-10 rounded-xl">X</button>
              <button
                onClick={() => { setStep(2); setIsImport(false); setMnemonicCount(12); setMnemonics(Array(12).fill('')); }}
                className="bg-gray-800 hover:bg-gray-900 p-4 rounded-xl h-20 font-extrabold text-2xl"
              >
                CREATE A NEW WALLET
              </button>
              <button
                onClick={() => { setStep(2); setIsImport(true); setMnemonicCount(12); setMnemonics(Array(12).fill('')); }}
                className="bg-gray-800 hover:bg-gray-900 p-4 rounded-xl h-20 font-extrabold text-2xl"
              >
                IMPORT AN EXISTING WALLET
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div className="flex flex-col h-full w-full gap-6 overflow-auto">
              <h1 className="text-6xl font-extrabold self-center mb-6">CRYPT7</h1>
              <button onClick={onClose} className="absolute top-5 right-5 bg-gray-900 h-10 w-10 rounded-xl">X</button>
              {isImport ? (
                <>
                  <div className="flex gap-4 justify-center mb-4">
                    <button
                      onClick={() => { setMnemonicCount(12); setMnemonics(Array(12).fill('')); }}
                      className={`px-6 py-2 rounded-xl font-bold ${mnemonicCount === 12 ? 'bg-gray-900' : 'bg-gray-700 hover:bg-gray-800'}`}
                    >
                      12 Words
                    </button>
                    <button
                      onClick={() => { setMnemonicCount(24); setMnemonics(Array(24).fill('')); }}
                      className={`px-6 py-2 rounded-xl font-bold ${mnemonicCount === 24 ? 'bg-gray-900' : 'bg-gray-700 hover:bg-gray-800'}`}
                    >
                      24 Words
                    </button>
                  </div>
                  {renderMnemonicInputs()}
                  <button
                    onClick={() => setStep(3)}
                    disabled={mnemonics.slice(0, mnemonicCount).some(word => word.trim() === '')}
                    className={`mt-8 h-14 rounded-xl font-extrabold text-2xl bg-gray-800 hover:bg-gray-900 ${mnemonics.slice(0, mnemonicCount).some(word => word.trim() === '') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold mb-4">Your wallet will be generated after password setup.</h3>
                  <button onClick={() => setStep(3)} className="bg-gray-800 hover:bg-gray-900 p-4 rounded-xl h-20 font-extrabold text-2xl">Next</button>
                </>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div className="flex flex-col h-full w-full gap-6">
              <h1 className="text-6xl font-extrabold self-center mb-6">CRYPT7</h1>
              <button onClick={onClose} className="absolute top-5 right-5 bg-gray-900 h-10 w-10 rounded-xl">X</button>
              <h3 className="text-3xl font-bold">Set Password</h3>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-gray-800 h-12 text-xl w-full font-bold outline-none p-3 rounded"
                autoComplete="new-password"
              />
              <h3 className="text-3xl font-bold">Confirm Password</h3>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-gray-800 h-12 text-xl w-full font-bold outline-none p-3 rounded"
                autoComplete="new-password"
              />
              <button onClick={handleEncrypt} className="bg-gray-800 hover:bg-gray-900 p-4 rounded-xl h-16 font-extrabold text-2xl mt-6">Finish</button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div className="flex flex-col h-full w-full gap-6">
              <h1 className="text-6xl font-extrabold self-center mb-12">CRYPT7</h1>
              <div className="grid grid-cols-3 gap-4 overflow-auto max-h-[400px]">
                {mnemonics.map((word, i) => (
                  <span key={i} className="text-xl font-bold px-3 py-2 bg-gray-700 rounded text-center">
                    {i + 1}. {word}
                  </span>
                ))}
              </div>
              <button onClick={onClose} className="mt-6 h-12 w-48 bg-gray-800 hover:bg-gray-900 rounded-xl self-center font-extrabold text-xl">lesgo</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GenerateWallet;







