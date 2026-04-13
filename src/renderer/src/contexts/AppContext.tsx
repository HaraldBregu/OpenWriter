import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import i18n from '../i18n';
import { DEFAULT_THEME_MODE, isThemeMode } from '../../../shared/theme';
import type { ThemeData, ThemeMode } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type { ThemeMode } from '../../../shared/types';
export type AppLanguage = 'en' | 'it';
export type AppTheme =
	| 'default'
	| 'aurora'
	| 'ember'
	| 'ocean'
	| 'forest'
	| 'lavender'
	| 'midnight'
	| 'sandstone';
export type SidebarState = 'expanded' | 'collapsed';

// Kept for backward-compatibility with the test file and any external consumers.
export interface AppState {
	theme: ThemeMode;
	appTheme: AppTheme;
	language: AppLanguage;
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const THEME_STORAGE_KEY = 'app-theme-mode';
const APP_THEME_STORAGE_KEY = 'app-theme';
const LANGUAGE_STORAGE_KEY = 'app-language';
const CUSTOM_THEME_STORAGE_KEY = 'app-custom-theme-id';
const DARK_CLASS = 'dark';

/** Convert camelCase token key to kebab-case CSS variable name. */
function tokenKeyToCssVar(key: string, prefix = ''): string {
	const base = key.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
	return prefix ? `--${prefix}-${base}` : `--${base}`;
}

/** Apply a set of ThemeData as CSS custom properties on the document root. */
function applyThemeData(data: ThemeData): void {
	const root = document.documentElement;
	for (const [key, value] of Object.entries(data)) {
		if (key === 'titleBar' && typeof value === 'object' && value !== null) {
			for (const [tbKey, tbValue] of Object.entries(value as Record<string, string>)) {
				root.style.setProperty(tokenKeyToCssVar(tbKey, 'title-bar'), tbValue);
			}
		} else if (key === 'page' && typeof value === 'object' && value !== null) {
			for (const [pgKey, pgValue] of Object.entries(value as Record<string, unknown>)) {
				if (typeof pgValue === 'object' && pgValue !== null) {
					for (const [nestedKey, nestedValue] of Object.entries(pgValue as Record<string, string>)) {
						root.style.setProperty(tokenKeyToCssVar(nestedKey, `page-${pgKey}`), nestedValue);
					}
				} else {
					root.style.setProperty(tokenKeyToCssVar(pgKey, 'page'), pgValue as string);
				}
			}
		} else if (key === 'sidebar' && typeof value === 'object' && value !== null) {
			for (const [sbKey, sbValue] of Object.entries(value as Record<string, string>)) {
				root.style.setProperty(tokenKeyToCssVar(sbKey, 'sidebar'), sbValue);
			}
		} else {
			root.style.setProperty(tokenKeyToCssVar(key), value as string);
		}
	}
}

/** Remove all inline CSS custom properties previously set by applyThemeData. */
function clearThemeData(): void {
	document.documentElement.removeAttribute('style');
}

const VALID_APP_THEMES: readonly AppTheme[] = [
	'default',
	'aurora',
	'ember',
	'ocean',
	'forest',
	'lavender',
	'midnight',
	'sandstone',
] as const;

function isAppTheme(value: string): value is AppTheme {
	return VALID_APP_THEMES.includes(value as AppTheme);
}

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

function readPersistedAppTheme(): AppTheme {
	try {
		const stored = localStorage.getItem(APP_THEME_STORAGE_KEY);
		if (stored && isAppTheme(stored)) return stored;
	} catch {
		// localStorage may be unavailable in some contexts
	}
	return 'default';
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
// 3. AppThemeContext
// ---------------------------------------------------------------------------

function readPersistedCustomThemeId(): string | null {
	try {
		return localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
	} catch {
		return null;
	}
}

interface AppThemeContextValue {
	appTheme: AppTheme;
	customThemeId: string | null;
	setAppTheme: (theme: AppTheme) => void;
	setCustomTheme: (id: string | null) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

function AppThemeProvider({
	children,
	initialAppTheme,
}: {
	children: React.ReactNode;
	initialAppTheme?: AppTheme;
}) {
	const [appTheme, setAppThemeState] = useState<AppTheme>(
		initialAppTheme ?? readPersistedAppTheme()
	);
	const [customThemeId, setCustomThemeIdState] = useState<string | null>(
		readPersistedCustomThemeId
	);

	const setAppTheme = useCallback((next: AppTheme) => {
		setAppThemeState(next);
		setCustomThemeIdState(null);
	}, []);

	const setCustomTheme = useCallback((id: string | null) => {
		setCustomThemeIdState(id);
		if (id) {
			setAppThemeState('default');
		}
	}, []);

	// Persist app theme selection.
	useEffect(() => {
		try {
			localStorage.setItem(APP_THEME_STORAGE_KEY, appTheme);
		} catch {
			// localStorage may be unavailable
		}
	}, [appTheme]);

	// Persist custom theme ID.
	useEffect(() => {
		try {
			if (customThemeId) {
				localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, customThemeId);
			} else {
				localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
			}
		} catch {
			// localStorage may be unavailable
		}
	}, [customThemeId]);

	// Fetch and apply custom theme tokens when customThemeId changes.
	// Also re-apply when dark/light mode toggles (observed via MutationObserver).
	useEffect(() => {
		if (!customThemeId) {
			clearThemeData();
			return;
		}

		let cancelled = false;
		let cachedManifest: { light: ThemeData; dark: ThemeData } | null = null;

		const apply = (): void => {
			if (!cachedManifest) return;
			const isDark = document.documentElement.classList.contains(DARK_CLASS);
			applyThemeData(isDark ? cachedManifest.dark : cachedManifest.light);
		};

		(async () => {
			try {
				const manifest = await window.app?.getCustomThemeTokens(customThemeId);
				if (cancelled || !manifest) return;
				cachedManifest = manifest;
				apply();
			} catch {
				if (!cancelled) clearThemeData();
			}
		})();

		// Re-apply tokens when the dark class toggles on <html>.
		const observer = new MutationObserver(() => apply());
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, [customThemeId]);

	const value = useMemo<AppThemeContextValue>(
		() => ({ appTheme, customThemeId, setAppTheme, setCustomTheme }),
		[appTheme, customThemeId, setAppTheme, setCustomTheme]
	);

	return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppThemeContext(): AppThemeContextValue {
	const ctx = useContext(AppThemeContext);
	if (ctx === undefined) throw new Error('useAppThemeContext must be used within an AppProvider');
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
			<AppThemeProvider initialAppTheme={initialState?.appTheme}>
				<LanguageProvider initialLanguage={initialState?.language}>
					{children}
				</LanguageProvider>
			</AppThemeProvider>
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
 * (`useThemeMode`, `useCurrentUser`, etc.) to avoid unnecessary re-renders.
 */
export function useAppState(): AppState {
	const { theme } = useTheme();
	const { appTheme } = useAppThemeContext();
	const { language } = useLanguageContext();
	return useMemo(() => ({ theme, appTheme, language }), [theme, appTheme, language]);
}

/** Backward-compatible actions bag. */
export interface AppActionsContextValue {
	setTheme: (theme: ThemeMode) => void;
	setAppTheme: (theme: AppTheme) => void;
	setCustomTheme: (id: string | null) => void;
	setLanguage: (language: AppLanguage) => void;
	toggleModal: (modal: keyof ModalState, open?: boolean) => void;
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
	const { toggleModal } = useModalContext();

	const resetState = useCallback(() => {
		setTheme(readPersistedTheme());
		setAppTheme(readPersistedAppTheme());
		setCustomTheme(null);
		setLanguage(readPersistedLanguage());
		toggleModal('settingsOpen', false);
		toggleModal('commandPaletteOpen', false);
		toggleModal('searchOpen', false);
		toggleModal('shareDialogOpen', false);
	}, [setTheme, setAppTheme, setCustomTheme, setLanguage, toggleModal]);

	return useMemo(
		() => ({
			setTheme,
			setAppTheme,
			setCustomTheme,
			setLanguage,
			toggleModal,
			resetState,
		}),
		[setTheme, setAppTheme, setCustomTheme, setLanguage, toggleModal, resetState]
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

export function useModalStates(): ModalState {
	return useModalContext().modals;
}

export function useModal(modal: keyof ModalState): [boolean, (open?: boolean) => void] {
	const { modals, toggleModal } = useModalContext();
	const toggle = useCallback((open?: boolean) => toggleModal(modal, open), [modal, toggleModal]);
	return [modals[modal], toggle];
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
