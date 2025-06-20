import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { stylesState, StylesState } from "./editor-styles.state";
import _ from "lodash";

const initialState: StylesState = stylesState

const stylesSlice = createSlice({
  name: "styles",
  initialState,
  reducers: {
    updateStyles(state, action: PayloadAction<Style[]>) {
      state.styles = action.payload;
    },
  },
});

export const { updateStyles } = stylesSlice.actions;
export default stylesSlice.reducer;