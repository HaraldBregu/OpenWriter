import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store/rootReducers";

export const selectStyles = (state: RootState) => state.styles?.styles || [];

// Array dei tipi consentiti
const ALLOWED_TYPES = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'CUSTOM'];

// Selettore per ottenere solo gli stili H1-H6 e CUSTOM
export const selectHeadingAndCustomStyles = createSelector(
  [selectStyles],
  (styles) => styles.filter(style => ALLOWED_TYPES.includes(style.type))
);

// Mantieni lo stato della mappatura degli ID personalizzati fuori dal selettore
const customStyleIdMap = new Map<string, number>();
let nextCustomId = -1;

function getStyleNumericId(style: string, name: string): string {
  switch (style) {
    case "H1": return "1";
    case "H2": return "2";
    case "H3": return "3";
    case "H4": return "4";
    case "H5": return "5";
    case "H6": return "6";
    case "P": return "0";
    default: {
      // per CUSTOM o altri stili non standard, usa type + name come chiave unica
      const uniqueKey = `${style}-${name}`;
      if (!customStyleIdMap.has(uniqueKey)) {
        customStyleIdMap.set(uniqueKey, nextCustomId--); // assegna e decrementa
      }
      return customStyleIdMap.get(uniqueKey)!.toString();
    }
  }
}

// Selettore per ottenere le opzioni degli stili con ID numerici (solo quelli abilitati)
export const selectStylesOptions = createSelector(
  [selectHeadingAndCustomStyles],
  (styles) => {
    return styles
      .filter(style => style.enabled === true)
      .map(({ name, type }) => ({ 
        label: name, 
        value: getStyleNumericId(type, name) 
      }));
  }
);
// Selettore per ottenere uno stile specifico per tipo
export const selectStyleByType = createSelector(
  [selectStyles, (_: any, styleType: string) => styleType],
  (styles, styleType) => styles.find(style => style.type === styleType)
);

// Selettore per ottenere solo gli stili abilitati
export const selectEnabledStyles = createSelector(
  [selectStyles],
  (styles) => styles.filter(style => style.enabled)
);
