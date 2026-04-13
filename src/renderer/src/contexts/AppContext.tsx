import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import i18n from '../i18n';
import { DEFAULT_THEME_MODE, isThemeMode } from '../../../shared/theme';
import type { ThemeMode } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type { ThemeMode } from '../../../shared/types';
export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';

// Kept for backward-compatibility with the test file and any external consumers.
export interface AppState {
	theme: ThemeMode;
	language: AppLanguage;
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const THEME_STORAGE_KEY = 'app-theme-mode';
const LANGUAGE_STORAGE_KEY = 'app-language';
const DARK_CLASS = 'dark';

function readPersistedTheme(): ThemeMode {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored && isThemeMode(stored)) return stored;
	} catch {
		// localStorage may be unavailable in some contexts
	}
	return DEFAULT_THEME_MODE;
}

function readPersistedLanguage(): AppLanguage {
	try {
		const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (stored === 'en' || stored === 'it') return stored;
	} catch {
		// localStorage may be unavailable in some contexts
	}
	return 'en';
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

// Apply theme class eagerly at module load time so the first paint uses the
// correct CSS variables and avoids a flash of the wrong theme.
applyThemeClass(readPersistedTheme());

// ---------------------------------------------------------------------------
// 1. ThemeContext
// ---------------------------------------------------------------------------

interface ThemeContextValue {
	theme: ThemeMode;
	setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function ThemeProvider({
	children,
	initialTheme,
}: {
	children: React.ReactNode;
	initialTheme?: ThemeMode;
}) {
	const [theme, setThemeState] = useState<ThemeMode>(initialTheme ?? readPersistedTheme());

	const setTheme = useCallback((next: ThemeMode) => setThemeState(next), []);

	// Apply DOM class, persist, and notify main process on theme change.
	useEffect(() => {
		applyThemeClass(theme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch (error) {
			console.error('Failed to save theme mode:', error);
		}
		// window.app is only present inside the Electron preload context.
		// Guard against undefined so this works safely in tests and any
		// environment where the preload bridge is not loaded.
		window.app?.setTheme(theme);
	}, [theme]);

	// Track OS preference changes in real-time when mode is 'system'.
	useEffect(() => {
		if (theme !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handleOsChange = (e: MediaQueryListEvent): void => {
			document.documentElement.classList.toggle(DARK_CLASS, e.matches);
		};
		mq.addEventListener('change', handleOsChange);
		return () => mq.removeEventListener('change', handleOsChange);
	}, [theme]);

	// Sync theme changes broadcast from the Electron main process (e.g. sibling windows).
	useEffect(() => {
		// Guard: window.app is only available inside the Electron preload context.
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

// ---------------------------------------------------------------------------
// 2. LanguageContext
// ---------------------------------------------------------------------------

interface LanguageContextValue {
	language: AppLanguage;
	setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function LanguageProvider({
	children,
	initialLanguage,
}: {
	children: React.ReactNode;
	initialLanguage?: AppLanguage;
}) {
	const [language, setLanguageState] = useState<AppLanguage>(
		initialLanguage ?? readPersistedLanguage()
	);

	const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);

	// Apply i18n change, persist, and notify main process on language change.
	useEffect(() => {
		i18n.changeLanguage(language);
		try {
			localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch (error) {
			console.error('Failed to save language preference:', error);
		}
		// window.app is only present inside the Electron preload context.
		window.app?.setLanguage(language);
	}, [language]);

	// Sync language changes broadcast from the Electron main process (e.g. sibling windows).
	useEffect(() => {
		// Guard: window.app is only available inside the Electron preload context.
		if (!window.app?.onLanguageChange) return;
		return window.app.onLanguageChange((incoming: string) => {
			if (incoming === 'en' || incoming === 'it') {
				setLanguageState(incoming as AppLanguage);
			}
		});
	}, []);

	const value = useMemo<LanguageContextValue>(
		() => ({ language, setLanguage }),
		[language, setLanguage]
	);

	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (ctx === undefined) throw new Error('useLanguageContext must be used within an AppProvider');
	return ctx;
}

// ---------------------------------------------------------------------------
// AppProvider — composition root for all focused providers
// ---------------------------------------------------------------------------

interface AppProviderProps {
	children: React.ReactNode;
	/** Partial initial state for testing and storybook scenarios. */
	initialState?: Partial<AppState>;
}

export function AppProvider({ children, initialState }: AppProviderProps) {
	return (
		<ThemeProvider initialTheme={initialState?.theme}>
			<LanguageProvider initialLanguage={initialState?.language}>{children}</LanguageProvider>
		</ThemeProvider>
	);
}

// ---------------------------------------------------------------------------
// Backward-compatible aggregate hooks
//
// These preserve the existing public API so call sites don't need to change.
// ---------------------------------------------------------------------------

/**
 * Returns the full AppState snapshot. Prefer the focused hooks below
 * (`useThemeMode`, `useLanguageMode`, etc.) to avoid unnecessary re-renders.
 */
export function useAppState(): AppState {
	const { theme } = useTheme();
	const { language } = useLanguageContext();
	return useMemo(() => ({ theme, language }), [theme, language]);
}

/** Backward-compatible actions bag. */
export interface AppActionsContextValue {
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: AppLanguage) => void;
	resetState: () => void;
}

/**
 * Returns all action creators in a single bag — matches the old API.
 * Components using only actions won't re-render on state changes because
 * each individual provider's action ref is stable.
 */
export function useAppActions(): AppActionsContextValue {
	const { setTheme } = useTheme();
	const { setAppTheme, setCustomTheme } = useAppThemeContext();
	const { setLanguage } = useLanguageContext();

	const resetState = useCallback(() => {
		setTheme(readPersistedTheme());
		setAppTheme(readPersistedAppTheme());
		setCustomTheme(null);
		setLanguage(readPersistedLanguage());
	}, [setTheme, setAppTheme, setCustomTheme, setLanguage]);

	return useMemo(
		() => ({
			setTheme,
			setAppTheme,
			setCustomTheme,
			setLanguage,
			resetState,
		}),
		[setTheme, setAppTheme, setCustomTheme, setLanguage, resetState]
	);
}

/**
 * Select a derived value from the full AppState.
 * Only re-renders when the selected value changes.
 */
export function useAppSelector<T>(selector: (state: AppState) => T): T {
	const state = useAppState();
	return useMemo(() => selector(state), [state, selector]);
}

// ---------------------------------------------------------------------------
// Focused convenience hooks (unchanged public API)
// ---------------------------------------------------------------------------

export function useThemeMode(): ThemeMode {
	return useTheme().theme;
}

export function useAppTheme(): AppTheme {
	return useAppThemeContext().appTheme;
}

export function useCustomThemeId(): string | null {
	return useAppThemeContext().customThemeId;
}

export function useLanguageMode(): AppLanguage {
	return useLanguageContext().language;
}

// ---------------------------------------------------------------------------
// Legacy context exports (some tests import these directly)
// ---------------------------------------------------------------------------

// These are thin facades so the test file import `{ AppStateContext, AppActionsContext }`
// continues to compile. They are not meaningful for new code.
export const AppStateContext = createContext<AppState | undefined>(undefined);
export const AppActionsContext = createContext<AppActionsContextValue | undefined>(undefined);

// Kept for type compatibility only.
export interface AppContextValue {
	state: AppState;
	dispatch: React.Dispatch<never>;
}
