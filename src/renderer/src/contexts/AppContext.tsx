import { createContext } from 'react';
import type { ThemeMode } from '../../../shared/types';
import { ThemeProvider } from './ThemeProvider';
import { LanguageProvider } from './LanguageProvider';

export {
	useTheme,
	useLanguageContext,
	useAppState,
	useAppActions,
	useAppSelector,
	useThemeMode,
	useLanguageMode,
} from './hooks';

export type { ThemeMode } from '../../../shared/types';
export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';

export interface AppState {
	theme: ThemeMode;
	language: AppLanguage;
}

export interface AppActionsContextValue {
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: AppLanguage) => void;
	resetState: () => void;
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

export const AppStateContext = createContext<AppState | undefined>(undefined);
export const AppActionsContext = createContext<AppActionsContextValue | undefined>(undefined);

export interface AppContextValue {
	state: AppState;
	dispatch: React.Dispatch<never>;
}
