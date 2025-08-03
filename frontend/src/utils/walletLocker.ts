import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface walletState {
    isUnlocked: boolean;
    mnemonic: string | null;
}

const initialState: walletState = {
    isUnlocked: false,
    mnemonic: null,
}

const walletSlice = createSlice({
    name:"wallet",
    initialState,
    reducers: {
        unlockWallet: (state, action: PayloadAction<string>) => {
            state.isUnlocked = true;
            state.mnemonic = action.payload;
        },
        lockWallet: (state) => {
            state.isUnlocked = false;
            state.mnemonic = null;
        }
    }
});

export const { unlockWallet, lockWallet } = walletSlice.actions;
export default walletSlice.reducer;