import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface WalletState {
    isUnlocked: boolean;
    privateKey?: string; 
}

const initialState: WalletState = {
    isUnlocked: false,
    privateKey: undefined,
};

const walletSlice = createSlice({
    name: "wallet",
    initialState,
    reducers: {
        unlockWallet: (state, action: PayloadAction<string>) => {
            state.isUnlocked = true;
            state.privateKey = action.payload;
        },
        lockWallet: (state) => {
            state.isUnlocked = false;
            state.privateKey = undefined;
        }
    }
});

export const { unlockWallet, lockWallet } = walletSlice.actions;
export default walletSlice.reducer;
