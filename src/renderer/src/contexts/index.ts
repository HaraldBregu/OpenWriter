/**
 * Context providers and hooks for app-wide state management
 *
 * This context system complements Redux by handling UI state that doesn't
 * need to be in the global Redux store. Use this for:
 * - Theme preferences
 * - Transient UI state
 *
 * Use Redux for:
 * - Document/post data
 * - Complex async operations
 * - Data that needs middleware processing
 * - Time-travel debugging requirements
 */

export {
	AppProvider,
	useAppState,
	useAppActions,
	useAppSelector,
	useThemeMode,
	useAppTheme,
	useCustomThemeId,
	useLanguageMode,
	AppStateContext,
	AppActionsContext,
} from './AppContext';

export type {
	ThemeMode,
	AppTheme,
	AppLanguage,
	SidebarState,
	AppState,
	AppContextValue,
	AppActionsContextValue,
} from './AppContext';
