import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "src/renderer/src/store/store";

// Selettore base per lo stato delle tabs
const tabsState = (state: RootState) => state.tabs;

export const selectTabs = createSelector(
    tabsState,
    (tabs) => tabs.items
);

export const selectSelectedTab = createSelector(
    tabsState,
    (tabs) => tabs.selectedTab
);
