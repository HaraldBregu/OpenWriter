import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { stylesState, StylesState } from "./editor-styles.state";
import _ from "lodash";

const initialState: StylesState = stylesState

const stylesSlice = createSlice({
  name: "styles",
  initialState,
  reducers: {
    updateStyles(state, action: PayloadAction<Style[]>) {
      // @todo Merge the new styles with the existing ones, avoiding duplicates based on 'type'
      const merged = _.unionBy(action.payload, state.styles, 'name');
      state.styles = merged;
    },
  },
});

export const { updateStyles } = stylesSlice.actions;
export default stylesSlice.reducer;