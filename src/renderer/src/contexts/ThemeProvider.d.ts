import React from 'react';
import type { ThemeMode } from '../../../shared/types';
export declare function readPersistedTheme(): ThemeMode;
export interface ThemeContextValue {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
}
export declare const ThemeContext: React.Context<ThemeContextValue | undefined>;
export declare function ThemeProvider({ children, initialTheme, }: {
    children: React.ReactNode;
    initialTheme?: ThemeMode;
}): import("react/jsx-runtime").JSX.Element;
