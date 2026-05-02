import { jsx as _jsx } from "react/jsx-runtime";
import { createContext } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { LanguageProvider } from './LanguageProvider';
import { SidebarVisibilityProvider } from './SidebarVisibilityProvider';
import { DebugDialogsProvider } from './DebugDialogsContext';
import { ImagesProvider } from './ImagesProvider';
import { ContentProvider } from './ContentProvider';
export function AppProvider({ children, initialState }) {
    return (_jsx(ThemeProvider, { initialTheme: initialState?.theme, children: _jsx(LanguageProvider, { initialLanguage: initialState?.language, children: _jsx(SidebarVisibilityProvider, { children: _jsx(ImagesProvider, { children: _jsx(ContentProvider, { children: _jsx(DebugDialogsProvider, { children: children }) }) }) }) }) }));
}
export const AppStateContext = createContext(undefined);
export const AppActionsContext = createContext(undefined);
