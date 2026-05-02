import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useMemo, useState, useEffect } from 'react';
import i18n from '../i18n';
const LANGUAGE_STORAGE_KEY = 'app-language';
export function readPersistedLanguage() {
    try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'it')
            return stored;
    }
    catch {
        /* empty */
    }
    return 'en';
}
export const LanguageContext = createContext(undefined);
export function LanguageProvider({ children, initialLanguage, }) {
    const [language, setLanguageState] = useState(initialLanguage ?? readPersistedLanguage());
    const setLanguage = useCallback((next) => setLanguageState(next), []);
    useEffect(() => {
        i18n.changeLanguage(language);
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        }
        catch {
            /* empty */
        }
        window.app?.setLanguage(language);
    }, [language]);
    useEffect(() => {
        if (!window.app?.onLanguageChange)
            return;
        return window.app.onLanguageChange((incoming) => {
            if (incoming === 'en' || incoming === 'it') {
                setLanguageState(incoming);
            }
        });
    }, []);
    const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
    return _jsx(LanguageContext.Provider, { value: value, children: children });
}
