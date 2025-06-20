import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setupPageInitialState, SetupSettingsState, TElement } from "./layout.state";
import { SetupPageState } from "./layout.state";

const layoutSlice = createSlice({
    name: "layout",
    initialState: setupPageInitialState,
    reducers: {
        updateSetupPageState: (state, action: PayloadAction<SetupSettingsState>) => {
            state.settings = action.payload;
        },
        addApparatusInCritical:(state, action:PayloadAction<TElement>) => {
            state.settings.setupDialogState.critical.apparatusDetails.push(action.payload);
        },
        updateApparatusArrayInCritical:(state, action:PayloadAction<TElement[]>) => {
            state.settings.setupDialogState.critical.apparatusDetails = [...action.payload];
        },
        updatePageSetupOptions:(state, action:PayloadAction<SetupOptionType>) => {
            state.settings.setupOption = action.payload;
        },
    },
})

export type { SetupPageState };
export const {updateSetupPageState, addApparatusInCritical, updateApparatusArrayInCritical, updatePageSetupOptions} = layoutSlice.actions;
export default layoutSlice.reducer;
