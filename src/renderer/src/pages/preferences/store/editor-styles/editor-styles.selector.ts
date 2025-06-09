import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store/rootReducers";


export const selectStyles = (state: RootState) => state.styles?.styles || [];

export const selectEnabledStyles = createSelector(
  [selectStyles],
  (styles) => styles.filter(style => style.enabled)
);
