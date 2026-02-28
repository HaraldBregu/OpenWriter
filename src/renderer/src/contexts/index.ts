/**
 * Context providers and hooks for app-wide state management
 *
 * This context system complements Redux by handling UI state that doesn't
 * need to be in the global Redux store. Use this for:
 * - Theme preferences
 * - UI preferences (sidebar state, modal states, etc.)
 * - User session data
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
  useCurrentUser,
  useUIPreferences,
  useModalStates,
  useModal,
  useOnlineStatus,
  useLastSyncTime,
  AppStateContext,
  AppActionsContext
} from './AppContext'

export type {
  ThemeMode,
  SidebarState,
  User,
  UIPreferences,
  ModalState,
  AppState,
  AppContextValue,
  AppActionsContextValue
} from './AppContext'
