import React from 'react';
import type { AppLanguage } from './AppContext';
export declare function readPersistedLanguage(): AppLanguage;
export interface LanguageContextValue {
    language: AppLanguage;
    setLanguage: (language: AppLanguage) => void;
}
export declare const LanguageContext: React.Context<LanguageContextValue | undefined>;
export declare function LanguageProvider({ children, initialLanguage, }: {
    children: React.ReactNode;
    initialLanguage?: AppLanguage;
}): import("react/jsx-runtime").JSX.Element;
