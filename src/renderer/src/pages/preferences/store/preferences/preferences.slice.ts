import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type DocumentTemplate = any

export interface PreferencesState {
  documentTemplate: any;
}

const initialState: PreferencesState = {
  documentTemplate: null
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setDocumentTemplate(state, action: PayloadAction<DocumentTemplate>) {
      state.documentTemplate = action.payload;
    },
  },
});

export const { setDocumentTemplate } = preferencesSlice.actions;
export default preferencesSlice.reducer;
