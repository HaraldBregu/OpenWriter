import { createSlice } from "@reduxjs/toolkit";

export type DocumentTemplate = any

export interface PreferencesState {

}

const initialState: PreferencesState = {
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
  },
});

export const { } = preferencesSlice.actions;
export default preferencesSlice.reducer;
