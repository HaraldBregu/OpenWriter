import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "src/renderer/src/store/store";

export const selectPreferences = (state: RootState) => state.preferences || null;

export const selectDocumentTemplate = createSelector(
    [selectPreferences],
    (preferences) => preferences.documentTemplate
);

