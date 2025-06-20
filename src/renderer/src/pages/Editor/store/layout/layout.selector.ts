import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store/rootReducers";
// Selettore base per lo stato del layout
const layoutState = (state: RootState) => state.layout;

// Selettori per le impostazioni di layout
export const selectLayoutSettings = createSelector(
    layoutState,
    (layout) => layout.settings
);

export const selectLayoutStandardPageDimensions = createSelector(
    layoutState,
    (layout) => layout.standardPageDimensions
);

export const selectLayoutAvailableApparatusTypes = createSelector(
    layoutState,
    (layout) => layout.availableApparatusTypes
);
