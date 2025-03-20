import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MainState {
    sidebarOpen: boolean;
}

const initialState: MainState = {
    sidebarOpen: false,
};

const mainSlice = createSlice({
    name: 'main',
    initialState,
    reducers: {
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
    },
});

export const { setSidebarOpen, toggleSidebar } = mainSlice.actions;

export default mainSlice.reducer;