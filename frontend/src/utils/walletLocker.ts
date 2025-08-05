import { createSlice } from "@reduxjs/toolkit";

interface walletState {
    isUnlocked: boolean;
}

const initialState: walletState = {
    isUnlocked: false,
}

const walletSlice = createSlice({
    name:"wallet",
    initialState,
    reducers: {
        unlockWallet: (state) => {
            state.isUnlocked = true;
        },
        lockWallet: (state) => {
            state.isUnlocked = false;
        }
    }
});

export const { unlockWallet, lockWallet } = walletSlice.actions;
export default walletSlice.reducer;