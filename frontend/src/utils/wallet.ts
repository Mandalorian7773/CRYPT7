import init, { derive_ethereum_account } from './../pkg/wallet_rs';


export async function deriveAccount(mnemonic:string, index: number) {

    await init();
    
    const account = derive_ethereum_account(mnemonic, index);

    return {
        address: account.address as string,
        private_key: account.private_key as string
    };
}