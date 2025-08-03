import { useDispatch} from "react-redux";
import { unlockWallet } from './../utils/walletLocker.ts';
import { useState } from "react";
import { db } from './../utils/db';
import type { VaultRecord } from './../utils/db';
import init, { decryption } from './../pkg/wallet_rs'; 
import { useEffect } from 'react';
import GenerateWallet from "../components/newUser.tsx";


const Locker: React.FC = () => {
    const dispatch = useDispatch();
    const [password, setPassword] = useState<string>("");
    const [noWallet, setNoWallet] = useState<boolean>(false);

    useEffect(() => {
        const walletData = async () => {
            const walletData:VaultRecord | undefined = await db.wallets.toCollection().first();

            if(!walletData){
                setNoWallet(true);
            };
        }
        walletData();
    });

    const unlock = async () => {       
    const walletData:VaultRecord | undefined = await db.wallets.toCollection().first();
    
    if (!walletData) return;
          
    try {
        await init();
        const mnemonic = decryption(
            password,
            walletData.salt,
            walletData.nonce,
            walletData.ciphertext,
            )    
        dispatch(unlockWallet(mnemonic));
        setPassword("")
        } catch (error) {
          alert("wrong password, try again!");
        }
    }

    if(noWallet) {
        return(
            <GenerateWallet onClose={() => setNoWallet(false)} />
        )
    }

    return (

        
        <div className='h-screen w-full bg-gray-900 flex flex-col justify-center items-center gap-10'>
            <h1 className="text-white text-4xl font-bold">Locked</h1>
            <p className="text-white text-xl font-bold">Enter your password</p>
            <input className="bg-black h-13 w-80 rounded-xl outline-none p-2 text-4xl" type="password" onChange={(e) => setPassword(e.target.value)}/>
            <button className="bg-black h-10 w-20 rounded-xl" onClick={unlock}>Unlock</button>
        </div>
    )
}

export default Locker;