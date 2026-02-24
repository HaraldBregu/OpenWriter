import React, { createContext, useContext, useCallback, useMemo, useReducer, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'system'
export type SidebarState = 'expanded' | 'collapsed'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface UIPreferences {
  sidebarState: SidebarState
  compactMode: boolean
  editorFontSize: number
  editorLineHeight: number
  showLineNumbers: boolean
  enableSpellCheck: boolean
}

export interface ModalState {
  settingsOpen: boolean
  commandPaletteOpen: boolean
  searchOpen: boolean
  shareDialogOpen: boolean
}

export interface AppState {
  theme: ThemeMode
  user: User | null
  uiPreferences: UIPreferences
  modals: ModalState
  isOnline: boolean
  lastSyncedAt: number | null
}

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

type AppAction =
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'UPDATE_UI_PREFERENCES'; payload: Partial<UIPreferences> }
  | { type: 'TOGGLE_MODAL'; payload: { modal: keyof ModalState; open?: boolean } }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'UPDATE_SYNC_TIME'; payload: number }
  | { type: 'RESET_STATE' }

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const defaultUIPreferences: UIPreferences = {
  sidebarState: 'expanded',
  compactMode: false,
  editorFontSize: 14,
  editorLineHeight: 1.6,
  showLineNumbers: true,
  enableSpellCheck: true
}

const defaultModalState: ModalState = {
  settingsOpen: false,
  commandPaletteOpen: false,
  searchOpen: false,
  shareDialogOpen: false
}

const THEME_STORAGE_KEY = 'app-theme-mode'
const DARK_CLASS = 'dark'

function readPersistedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage may be unavailable in some contexts
  }
  return 'system'
}

function applyThemeClass(theme: ThemeMode): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add(DARK_CLASS)
  } else if (theme === 'light') {
    root.classList.remove(DARK_CLASS)
  } else {
    // system — honour the OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle(DARK_CLASS, prefersDark)
  }
}

const initialState: AppState = {
  theme: readPersistedTheme(),
  user: null,
  uiPreferences: defaultUIPreferences,
  modals: defaultModalState,
  isOnline: navigator.onLine,
  lastSyncedAt: null
}

// Apply theme class eagerly at module load time — before React mounts —
// so the correct CSS variables are active on the very first paint.
// This prevents a flash of the wrong theme on startup.
applyThemeClass(initialState.theme)

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload }

    case 'SET_USER':
      return { ...state, user: action.payload }

    case 'UPDATE_UI_PREFERENCES':
      return {
        ...state,
        uiPreferences: { ...state.uiPreferences, ...action.payload }
      }

    case 'TOGGLE_MODAL': {
      const { modal, open } = action.payload
      return {
        ...state,
        modals: {
          ...state.modals,
          [modal]: open !== undefined ? open : !state.modals[modal]
        }
      }
    }

    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload }

    case 'UPDATE_SYNC_TIME':
      return { ...state, lastSyncedAt: action.payload }

    case 'RESET_STATE':
      return initialState

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context Definition (Split for Performance)
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

interface AppActionsContextValue {
  setTheme: (theme: ThemeMode) => void
  setUser: (user: User | null) => void
  updateUIPreferences: (preferences: Partial<UIPreferences>) => void
  toggleModal: (modal: keyof ModalState, open?: boolean) => void
  setOnlineStatus: (isOnline: boolean) => void
  updateSyncTime: (timestamp: number) => void
  resetState: () => void
}

// Create two separate contexts to prevent unnecessary re-renders
// State context - components that only need to read state
const AppStateContext = createContext<AppState | undefined>(undefined)

// Actions context - components that only need to dispatch actions
const AppActionsContext = createContext<AppActionsContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

interface AppProviderProps {
  children: React.ReactNode
  initialState?: Partial<AppState>
}

export function AppProvider({ children, initialState: customInitialState }: AppProviderProps) {
  // Merge custom initial state if provided
  const mergedInitialState = useMemo(
    () => ({
      ...initialState,
      ...customInitialState,
      uiPreferences: {
        ...initialState.uiPreferences,
        ...(customInitialState?.uiPreferences || {})
      },
      modals: {
        ...initialState.modals,
        ...(customInitialState?.modals || {})
      }
    }),
    [customInitialState]
  )

  const [state, dispatch] = useReducer(appReducer, mergedInitialState)

  // Memoized action creators to prevent re-renders
  const actions = useMemo<AppActionsContextValue>(
    () => ({
      setTheme: (theme: ThemeMode) => dispatch({ type: 'SET_THEME', payload: theme }),
      setUser: (user: User | null) => dispatch({ type: 'SET_USER', payload: user }),
      updateUIPreferences: (preferences: Partial<UIPreferences>) =>
        dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: preferences }),
      toggleModal: (modal: keyof ModalState, open?: boolean) =>
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal, open } }),
      setOnlineStatus: (isOnline: boolean) =>
        dispatch({ type: 'SET_ONLINE_STATUS', payload: isOnline }),
      updateSyncTime: (timestamp: number) =>
        dispatch({ type: 'UPDATE_SYNC_TIME', payload: timestamp }),
      resetState: () => dispatch({ type: 'RESET_STATE' })
    }),
    []
  )

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true })
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Apply DOM class, persist to localStorage, and notify main process whenever
  // theme changes. This runs for every route (including WelcomePage) because
  // AppProvider wraps the entire component tree.
  useEffect(() => {
    applyThemeClass(state.theme)

    try {
      localStorage.setItem(THEME_STORAGE_KEY, state.theme)
    } catch (error) {
      console.error('Failed to save theme mode:', error)
    }

    window.api.setTheme(state.theme)
  }, [state.theme])

  // When in "system" mode, track OS preference changes in real-time
  useEffect(() => {
    if (state.theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleOsChange = (e: MediaQueryListEvent): void => {
      document.documentElement.classList.toggle(DARK_CLASS, e.matches)
    }

    mq.addEventListener('change', handleOsChange)
    return () => mq.removeEventListener('change', handleOsChange)
  }, [state.theme])

  // Listen for IPC theme-change events from the Electron main process.
  // Keeps sibling windows in sync when theme is changed from another
  // window or from the macOS Developer menu.
  useEffect(() => {
    const cleanup = window.api.onThemeChange((theme: string) => {
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        dispatch({ type: 'SET_THEME', payload: theme as ThemeMode })
      }
    })
    return cleanup
  }, [])

  // Persist UI preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app-ui-preferences', JSON.stringify(state.uiPreferences))
    } catch (error) {
      console.error('Failed to save UI preferences:', error)
    }
  }, [state.uiPreferences])

  // Load UI preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-ui-preferences')
      if (saved) {
        const preferences = JSON.parse(saved) as UIPreferences
        dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: preferences })
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error)
    }
  }, [])

  return (
    <AppStateContext.Provider value={state}>
      <AppActionsContext.Provider value={actions}>
        {children}
      </AppActionsContext.Provider>
    </AppStateContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks for consuming context
// ---------------------------------------------------------------------------

/**
 * Hook to access the full app state.
 * Only use this if you need the entire state object.
 * For specific values, use the selector hooks below for better performance.
 */
export function useAppState(): AppState {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return context
}

/**
 * Hook to access app actions.
 * This hook does not cause re-renders when state changes.
 */
export function useAppActions(): AppActionsContextValue {
  const context = useContext(AppActionsContext)
  if (context === undefined) {
    throw new Error('useAppActions must be used within an AppProvider')
  }
  return context
}

/**
 * Hook to select a specific value from app state.
 * Only re-renders when the selected value changes.
 */
export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const state = useAppState()
  return useMemo(() => selector(state), [state, selector])
}

// ---------------------------------------------------------------------------
// Convenience hooks for common use cases
// ---------------------------------------------------------------------------

/**
 * Hook to get current theme mode
 */
export function useThemeMode(): ThemeMode {
  return useAppSelector((state) => state.theme)
}

/**
 * Hook to get current user
 */
export function useCurrentUser(): User | null {
  return useAppSelector((state) => state.user)
}

/**
 * Hook to get UI preferences
 */
export function useUIPreferences(): UIPreferences {
  return useAppSelector((state) => state.uiPreferences)
}

/**
 * Hook to get modal states
 */
export function useModalStates(): ModalState {
  return useAppSelector((state) => state.modals)
}

/**
 * Hook to get a specific modal state
 */
export function useModal(modal: keyof ModalState): [boolean, (open?: boolean) => void] {
  const isOpen = useAppSelector((state) => state.modals[modal])
  const { toggleModal } = useAppActions()

  const toggle = useCallback(
    (open?: boolean) => toggleModal(modal, open),
    [modal, toggleModal]
  )

  return [isOpen, toggle]
}

/**
 * Hook to get online status
 */
export function useOnlineStatus(): boolean {
  return useAppSelector((state) => state.isOnline)
}

/**
 * Hook to get last sync time
 */
export function useLastSyncTime(): number | null {
  return useAppSelector((state) => state.lastSyncedAt)
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { AppStateContext, AppActionsContext }
export type { AppContextValue, AppActionsContextValue }
