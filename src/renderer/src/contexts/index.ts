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

export {
  createEntityTaskContext,
} from './EntityTaskContext'

export type {
  EntityChatMessage,
  EntityTaskState,
  InferenceOptions,
  UseEntityTaskReturn,
  EntityTaskContextConfig,
  ITaskCompletionHandler,
} from './EntityTaskContext'

export {
  createAIAgentContext,
  StoryWriterTask,
  ContentReviewTask,
  SummarizerTask,
  ToneAdjusterTask,
  TextCompleterTask,
  useStoryWriterTask,
  useContentReviewTask,
  useSummarizerTask,
  useToneAdjusterTask,
  useTextCompleterTask,
} from './AIAgentTaskContext'

export type {
  AIAgentSubmitInput,
  AIAgentSubmitResult,
  AIAgentSaveOptions,
  AIAgentSaveResult,
  AIAgentMessage,
} from './AIAgentTaskContext'
