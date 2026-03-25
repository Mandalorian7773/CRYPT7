import { useState } from 'react';
import init, { encryption } from '../pkg/wallet_rs';
import { motion, AnimatePresence } from "motion/react";
import { db } from "./../utils/db";
import { useDispatch } from "react-redux";
import { unlockWallet } from './../utils/walletLocker.ts';
import { deriveAccount } from '../utils/wallet';

interface GenerateWalletProp {
  onClose: () => void;
}

// Format error messages for user display
function formatWalletError(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    if (message.includes('password')) {
      return "Invalid password. Password must be at least 8 characters.";
    }
    if (message.includes('mnemonic') || message.includes('seed')) {
      return "Failed to generate recovery phrase. Please try again.";
    }
    if (message.includes('encrypt')) {
      return "Failed to encrypt wallet data. Please try again.";
    }
    if (message.includes('wasm') || message.includes('init')) {
      return "Failed to initialize wallet module. Please refresh the page.";
    }
    if (message.includes('database') || message.includes('indexeddb') || message.includes('storage')) {
      return "Failed to save wallet. Storage may be full or unavailable.";
    }

    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}

const GenerateWallet: React.FC<GenerateWalletProp> = ({ onClose }) => {
  const [mnemonics, setMnemonics] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const validatePassword = (): { valid: boolean; error?: string } => {
    if (!password) {
      return { valid: false, error: "Password is required" };
    }
    if (password.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters" };
    }
    if (password !== confirmPassword) {
      return { valid: false, error: "Passwords do not match" };
    }
    return { valid: true };
  };

  const handleEncryption = async () => {
    setError(null);

    // Validate password
    const passwordValidation = validatePassword();
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "Invalid password");
      return;
    }

    setLoading(true);

    try {
      // Initialize WASM module
      try {
        await init();
      } catch (initErr) {
        console.error("WASM init error:", initErr);
        throw new Error("Failed to initialize wallet module");
      }

      // Generate encrypted wallet
      let parsedResult;
      try {
        parsedResult = encryption(password);
        console.log('Encryption result:', {
          hasMnemonic: !!parsedResult?.mnemonic,
          mnemonicWordCount: parsedResult?.mnemonic?.split(' ').length,
          hasEncryptedData: !!parsedResult?.encrypted_data
        });
      } catch (encErr) {
        console.error("Encryption error:", encErr);
        throw new Error("Failed to generate wallet");
      }

      if (!parsedResult || !parsedResult.mnemonic || !parsedResult.encrypted_data) {
        throw new Error("Invalid wallet data generated");
      }

      // Derive first account
      const index = 0;
      let account;
      try {
        account = await deriveAccount(parsedResult.mnemonic, index);
      } catch (deriveErr) {
        console.error("Derivation error:", deriveErr);
        throw new Error("Failed to derive wallet account");
      }

      if (!account?.address || !account?.private_key) {
        throw new Error("Failed to derive valid account");
      }

      // Prepare wallet data for storage
      const walletData = {
        salt: parsedResult.encrypted_data.salt,
        nonce: parsedResult.encrypted_data.nonce,
        ciphertext: parsedResult.encrypted_data.ciphertext,
        argon_version: parsedResult.encrypted_data.argon_version,
        argon_params: parsedResult.encrypted_data.argon_params,
        createdAt: Date.now(),
      };

      // Save to database
      try {
        // Clear existing wallets (for new user flow)
        await db.wallets.clear();
        await db.accounts.clear();

        const vaultId = await db.wallets.add(walletData);

        const AccountData = {
          address: account.address,
          index: index,
          vaultId: vaultId,
          createdAt: Date.now(),
        };

        await db.accounts.add(AccountData);
      } catch (dbErr) {
        console.error("Database error:", dbErr);
        throw new Error("Failed to save wallet to storage");
      }

      // Unlock wallet
      dispatch(unlockWallet(account.private_key));

      // Show recovery phrase
      setMnemonics(parsedResult.mnemonic.split(' '));
      setStep(3);

    } catch (err) {
      console.error("Wallet creation error:", err);
      setError(formatWalletError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step === 2 && !loading) {
      handleEncryption();
    }
  };

  return (
    <div>
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-gray-600 p-8 rounded-xl shadow-lg h-140 w-120 flex flex-col">

          <AnimatePresence mode='wait'>
            {step === 1 && (
              <motion.div
                className='flex flex-col h-full w-full gap-15'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-2xl font-extrabold mb-15 self-center text-6xl">CRYPT7</h1>

                <button
                  onClick={() => {
                    setError(null);
                    setStep(2);
                  }}
                  className='bg-gray-800 hover:bg-gray-900 p-3 rounded-xl h-20 font-extrabold text-2xl transition-colors'
                >
                  CREATE A NEW WALLET
                </button>
                <button
                  onClick={() => {
                    alert("Import feature available in Wallets page after creating initial wallet.");
                  }}
                  className='bg-gray-800 hover:bg-gray-900 p-3 rounded-xl h-20 font-extrabold text-2xl transition-colors'
                >
                  IMPORT AN EXISTING WALLET
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                className='flex flex-col h-full w-full gap-5'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="font-extrabold mb-10 self-center text-6xl">CRYPT7</h1>

                <h3 className='text-3xl font-bold'>Set Password</h3>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder="Minimum 8 characters"
                  className='bg-gray-800 h-10 text-xl w-80 font-bold outline-none p-2 rounded placeholder-gray-500'
                  disabled={loading}
                  autoFocus
                />

                <h3 className='text-3xl font-bold'>Confirm Password</h3>
                <input
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder="Re-enter password"
                  className='bg-gray-800 h-10 text-xl w-80 font-bold outline-none p-2 rounded mb-4 placeholder-gray-500'
                  disabled={loading}
                />

                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleEncryption}
                  disabled={loading}
                  className={`p-3 rounded-xl h-20 font-extrabold text-2xl transition-colors ${
                    loading
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                >
                  {loading ? 'Creating Wallet...' : 'Generate Recovery Phrase'}
                </button>

                <button
                  onClick={() => {
                    setStep(1);
                    setPassword('');
                    setConfirmPassword('');
                    setError(null);
                  }}
                  disabled={loading}
                  className='text-gray-400 hover:text-white text-sm mt-2 transition-colors'
                >
                  ← Back
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                className='flex flex-col h-full w-full gap-5'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-2xl font-extrabold mb-4 self-center text-6xl">CRYPT7</h1>

                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm font-semibold">
                    ⚠️ Write down these words in order and store them safely!
                  </p>
                  <p className="text-yellow-300 text-xs mt-1">
                    This is your only way to recover your wallet. Never share it with anyone.
                  </p>
                </div>

                <div className='grid grid-cols-3 gap-2'>
                  {mnemonics.map((word, i) => (
                    <span key={i} className='text px-2 font-bold bg-gray-700 rounded py-1'>
                      {i + 1}. {word}
                    </span>
                  ))}
                </div>

                <div className='mt-6'>
                  <button
                    onClick={onClose}
                    className='h-12 w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-xl transition-colors'
                  >
                    I've Saved My Recovery Phrase
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GenerateWallet;
