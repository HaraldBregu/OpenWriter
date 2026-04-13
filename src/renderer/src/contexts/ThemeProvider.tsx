import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { DEFAULT_THEME_MODE, isThemeMode } from '../../../shared/theme';
import type { ThemeMode } from '../../../shared/types';

const THEME_STORAGE_KEY = 'app-theme-mode';
const DARK_CLASS = 'dark';

export function readPersistedTheme(): ThemeMode {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored && isThemeMode(stored)) return stored;
	} catch {
		/* empty */
	}
	return DEFAULT_THEME_MODE;
}

function applyThemeClass(theme: ThemeMode): void {
	const root = document.documentElement;
	if (theme === 'dark') {
		root.classList.add(DARK_CLASS);
	} else if (theme === 'light') {
		root.classList.remove(DARK_CLASS);
	} else {
		root.classList.toggle(DARK_CLASS, window.matchMedia('(prefers-color-scheme: dark)').matches);
	}
}

applyThemeClass(readPersistedTheme());

interface ThemeContextValue {
	theme: ThemeMode;
	setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
	children,
	initialTheme,
}: {
	children: React.ReactNode;
	initialTheme?: ThemeMode;
}) {
	const [theme, setThemeState] = useState<ThemeMode>(initialTheme ?? readPersistedTheme());
	const setTheme = useCallback((next: ThemeMode) => setThemeState(next), []);

	useEffect(() => {
		applyThemeClass(theme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			/* empty */
		}
		window.app?.setTheme(theme);
	}, [theme]);

	useEffect(() => {
		if (theme !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handleOsChange = (e: MediaQueryListEvent): void => {
			document.documentElement.classList.toggle(DARK_CLASS, e.matches);
		};
		mq.addEventListener('change', handleOsChange);
		return () => mq.removeEventListener('change', handleOsChange);
	}, [theme]);

	useEffect(() => {
		if (!window.app?.onThemeChange) return;
		return window.app.onThemeChange((incoming) => {
			setThemeState(incoming);
		});
	}, []);

	const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (ctx === undefined) throw new Error('useTheme must be used within an AppProvider');
	return ctx;
}
