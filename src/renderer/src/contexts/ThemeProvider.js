import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useMemo, useState, useEffect } from 'react';
import { DEFAULT_THEME_MODE, isThemeMode } from '../../../shared/theme';
import { applyThemeTokens, clearThemeTokens, readPersistedThemeStyle, resolveEffectiveVariant, DEFAULT_THEME_ID, } from '../lib/theme-tokens';
const THEME_STORAGE_KEY = 'app-theme-mode';
const DARK_CLASS = 'dark';
export function readPersistedTheme() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && isThemeMode(stored))
            return stored;
    }
    catch {
        /* empty */
    }
    return DEFAULT_THEME_MODE;
}
function applyThemeClass(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add(DARK_CLASS);
    }
    else if (theme === 'light') {
        root.classList.remove(DARK_CLASS);
    }
    else {
        root.classList.toggle(DARK_CLASS, window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
}
applyThemeClass(readPersistedTheme());
export const ThemeContext = createContext(undefined);
export function ThemeProvider({ children, initialTheme, }) {
    const [theme, setThemeState] = useState(initialTheme ?? readPersistedTheme());
    const setTheme = useCallback((next) => setThemeState(next), []);
    useEffect(() => {
        applyThemeClass(theme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
        catch {
            /* empty */
        }
        window.app?.setTheme(theme);
    }, [theme]);
    useEffect(() => {
        if (theme !== 'system')
            return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handleOsChange = (e) => {
            document.documentElement.classList.toggle(DARK_CLASS, e.matches);
        };
        mq.addEventListener('change', handleOsChange);
        return () => mq.removeEventListener('change', handleOsChange);
    }, [theme]);
    useEffect(() => {
        if (!window.app?.onThemeChange)
            return;
        return window.app.onThemeChange((incoming) => {
            setThemeState(incoming);
        });
    }, []);
    useEffect(() => {
        const themeStyleId = readPersistedThemeStyle();
        if (themeStyleId === DEFAULT_THEME_ID) {
            clearThemeTokens();
            return;
        }
        let cancelled = false;
        window.app?.getCustomThemeTokens(themeStyleId).then((manifest) => {
            if (cancelled || !manifest)
                return;
            const variant = resolveEffectiveVariant();
            applyThemeTokens(manifest[variant]);
        });
        return () => {
            cancelled = true;
        };
    }, [theme]);
    const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
