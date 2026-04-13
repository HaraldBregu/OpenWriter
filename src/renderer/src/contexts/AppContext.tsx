import { createContext, useCallback, useMemo } from 'react';
import type { ThemeMode } from '../../../shared/types';
import { ThemeProvider, useTheme, readPersistedTheme } from './ThemeProvider';
import { LanguageProvider, useLanguageContext, readPersistedLanguage } from './LanguageProvider';

export { useTheme } from './ThemeProvider';
export { useLanguageContext } from './LanguageProvider';

export type { ThemeMode } from '../../../shared/types';
export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';

export interface AppState {
	theme: ThemeMode;
	language: AppLanguage;
}

interface AppProviderProps {
	children: React.ReactNode;
	initialState?: Partial<AppState>;
}

export function AppProvider({ children, initialState }: AppProviderProps) {
	return (
		<ThemeProvider initialTheme={initialState?.theme}>
			<LanguageProvider initialLanguage={initialState?.language}>{children}</LanguageProvider>
		</ThemeProvider>
	);
}

export function useAppState(): AppState {
	const { theme } = useTheme();
	const { language } = useLanguageContext();
	return useMemo(() => ({ theme, language }), [theme, language]);
}

export interface AppActionsContextValue {
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: AppLanguage) => void;
	resetState: () => void;
}

export function useAppActions(): AppActionsContextValue {
	const { setTheme } = useTheme();
	const { setLanguage } = useLanguageContext();

	const resetState = useCallback(() => {
		setTheme(readPersistedTheme());
		setLanguage(readPersistedLanguage());
	}, [setTheme, setLanguage]);

	return useMemo(
		() => ({ setTheme, setLanguage, resetState }),
		[setTheme, setLanguage, resetState]
	);
}

export function useAppSelector<T>(selector: (state: AppState) => T): T {
	const state = useAppState();
	return useMemo(() => selector(state), [state, selector]);
}

export function useThemeMode(): ThemeMode {
	return useTheme().theme;
}

export function useLanguageMode(): AppLanguage {
	return useLanguageContext().language;
}

export const AppStateContext = createContext<AppState | undefined>(undefined);
export const AppActionsContext = createContext<AppActionsContextValue | undefined>(undefined);

export interface AppContextValue {
	state: AppState;
	dispatch: React.Dispatch<never>;
}
