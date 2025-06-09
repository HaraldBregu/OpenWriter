import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store/store";
import { PageNumberSettings } from "./pagination.slice";

// Selettore base per lo stato di paginazione
const paginationState = (state: RootState) => state.pagination;

// Selettori per line number settings
export const selectLineNumberSettings = createSelector(
    paginationState,
    (pagination) => pagination.lineNumberSettings
);

export const selectShowLines = createSelector(
    selectLineNumberSettings,
    (lineNumberSettings) => lineNumberSettings.showLines
);

export const selectLinesNumeration = createSelector(
    selectLineNumberSettings,
    (lineNumberSettings) => lineNumberSettings.linesNumeration
);

export const selectSectionLevel = createSelector(
    selectLineNumberSettings,
    (lineNumberSettings) => lineNumberSettings.sectionLevel
);

// Selettori per page number settings
export const selectPageNumberSettings = createSelector(
    paginationState,
    (pagination) => pagination.pageNumberSettings
);

// Selettori per sezioni specifiche
export const selectTocNumberSettings = createSelector(
    selectPageNumberSettings,
    (pageNumberSettings) => pageNumberSettings.toc
);

export const selectIntroNumberSettings = createSelector(
    selectPageNumberSettings,
    (pageNumberSettings) => pageNumberSettings.intro
);

export const selectCrtNumberSettings = createSelector(
    selectPageNumberSettings,
    (pageNumberSettings) => pageNumberSettings.crt
);

export const selectBiblioNumberSettings = createSelector(
    selectPageNumberSettings,
    (pageNumberSettings) => pageNumberSettings.biblio
);

// Selettore per una specifica sezione (usando un parametro)
export const selectSectionNumberSettings = (section: keyof PageNumberSettings) =>
    createSelector(
        selectPageNumberSettings,
        (pageNumberSettings) => pageNumberSettings[section]
    );

// Selettori per le impostazioni dell'header
export const selectHeaderSettings = createSelector(
    paginationState,
    (pagination) => pagination.headerSettings
);

export const selectHeaderDisplayMode = createSelector(
    selectHeaderSettings,
    (headerSettings) => headerSettings.displayMode
);

export const selectHeaderStartFromPage = createSelector(
    selectHeaderSettings,
    (headerSettings) => headerSettings.startFromPage
);

export const selectHeaderSectionsToShow = createSelector(
    selectHeaderSettings,
    (headerSettings) => headerSettings.sectionsToShow
);

export const selectHeaderLeftContent = createSelector(
    selectHeaderSettings,
    (headerSettings) => headerSettings.leftContent
);

export const selectHeaderCenterContent = createSelector(
    selectHeaderSettings,
    (headerSettings) => headerSettings.centerContent
);

export const selectHeaderRightContent = createSelector(
    selectHeaderSettings,
    (headerSettings) => headerSettings.rightContent
);

// Selettori per le impostazioni del footer
export const selectFooterSettings = createSelector(
    paginationState,
    (pagination) => pagination.footerSettings
);

export const selectFooterDisplayMode = createSelector(
    selectFooterSettings,
    (footerSettings) => footerSettings.displayMode
);

export const selectFooterStartFromPage = createSelector(
    selectFooterSettings,
    (footerSettings) => footerSettings.startFromPage
);

export const selectFooterSectionsToShow = createSelector(
    selectFooterSettings,
    (footerSettings) => footerSettings.sectionsToShow
);

export const selectFooterLeftContent = createSelector(
    selectFooterSettings,
    (footerSettings) => footerSettings.leftContent
);

export const selectFooterCenterContent = createSelector(
    selectFooterSettings,
    (footerSettings) => footerSettings.centerContent
);

export const selectFooterRightContent = createSelector(
    selectFooterSettings,
    (footerSettings) => footerSettings.rightContent
);