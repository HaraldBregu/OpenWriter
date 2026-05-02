import type { ThemeMode } from '../../../shared/types';
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
export declare function AppProvider({ children, initialState }: AppProviderProps): import("react/jsx-runtime").JSX.Element;
export declare const AppStateContext: import("react").Context<AppState | undefined>;
export declare const AppActionsContext: import("react").Context<AppActionsContextValue | undefined>;
export interface AppContextValue {
    state: AppState;
    dispatch: React.Dispatch<never>;
}
