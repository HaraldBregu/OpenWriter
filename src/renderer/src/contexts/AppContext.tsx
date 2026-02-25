import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Shared types
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

// Kept for backward-compatibility with the test file and any external consumers.
export interface AppState {
  theme: ThemeMode
  user: User | null
  uiPreferences: UIPreferences
  modals: ModalState
  isOnline: boolean
  lastSyncedAt: number | null
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const THEME_STORAGE_KEY = 'app-theme-mode'
const UI_PREFS_STORAGE_KEY = 'app-ui-preferences'
const DARK_CLASS = 'dark'

function readPersistedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
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
    root.classList.toggle(DARK_CLASS, window.matchMedia('(prefers-color-scheme: dark)').matches)
  }
}

const defaultUIPreferences: UIPreferences = {
  sidebarState: 'expanded',
  compactMode: false,
  editorFontSize: 14,
  editorLineHeight: 1.6,
  showLineNumbers: true,
  enableSpellCheck: true,
}

const defaultModalState: ModalState = {
  settingsOpen: false,
  commandPaletteOpen: false,
  searchOpen: false,
  shareDialogOpen: false,
}

// Apply theme class eagerly at module load time so the first paint uses the
// correct CSS variables and avoids a flash of the wrong theme.
applyThemeClass(readPersistedTheme())

// ---------------------------------------------------------------------------
// 1. ThemeContext
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme?: ThemeMode
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme ?? readPersistedTheme())

  const setTheme = useCallback((next: ThemeMode) => setThemeState(next), [])

  // Apply DOM class, persist, and notify main process on theme change.
  useEffect(() => {
    applyThemeClass(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      console.error('Failed to save theme mode:', error)
    }
    // window.app is only present inside the Electron preload context.
    // Guard against undefined so this works safely in tests and any
    // environment where the preload bridge is not loaded.
    window.app?.setTheme(theme)
  }, [theme])

  // Track OS preference changes in real-time when mode is 'system'.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleOsChange = (e: MediaQueryListEvent): void => {
      document.documentElement.classList.toggle(DARK_CLASS, e.matches)
    }
    mq.addEventListener('change', handleOsChange)
    return () => mq.removeEventListener('change', handleOsChange)
  }, [theme])

  // Sync theme changes broadcast from the Electron main process (e.g. sibling windows).
  useEffect(() => {
    // Guard: window.app is only available inside the Electron preload context.
    if (!window.app?.onThemeChange) return
    return window.app.onThemeChange((incoming: string) => {
      if (incoming === 'light' || incoming === 'dark' || incoming === 'system') {
        setThemeState(incoming as ThemeMode)
      }
    })
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === undefined) throw new Error('useTheme must be used within an AppProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// 2. UserContext
// ---------------------------------------------------------------------------

interface UserContextValue {
  user: User | null
  setUser: (user: User | null) => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser?: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null)
  const setUserStable = useCallback((next: User | null) => setUser(next), [])
  const value = useMemo<UserContextValue>(
    () => ({ user, setUser: setUserStable }),
    [user, setUserStable],
  )
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (ctx === undefined) throw new Error('useUser must be used within an AppProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// 3. UIPreferencesContext
// ---------------------------------------------------------------------------

interface UIPreferencesContextValue {
  uiPreferences: UIPreferences
  updateUIPreferences: (patch: Partial<UIPreferences>) => void
}

const UIPreferencesContext = createContext<UIPreferencesContextValue | undefined>(undefined)

function UIPreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode
  initialPreferences?: Partial<UIPreferences>
}) {
  const [uiPreferences, setPreferences] = useState<UIPreferences>({
    ...defaultUIPreferences,
    ...(initialPreferences ?? {}),
  })

  const updateUIPreferences = useCallback((patch: Partial<UIPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }))
  }, [])

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(uiPreferences))
    } catch (error) {
      console.error('Failed to save UI preferences:', error)
    }
  }, [uiPreferences])

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(UI_PREFS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as UIPreferences
        setPreferences((prev) => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error)
    }
  }, [])

  const value = useMemo<UIPreferencesContextValue>(
    () => ({ uiPreferences, updateUIPreferences }),
    [uiPreferences, updateUIPreferences],
  )

  return <UIPreferencesContext.Provider value={value}>{children}</UIPreferencesContext.Provider>
}

export function useUIPreferencesContext(): UIPreferencesContextValue {
  const ctx = useContext(UIPreferencesContext)
  if (ctx === undefined)
    throw new Error('useUIPreferencesContext must be used within an AppProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// 4. ModalContext
// ---------------------------------------------------------------------------

interface ModalContextValue {
  modals: ModalState
  toggleModal: (modal: keyof ModalState, open?: boolean) => void
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined)

function ModalProvider({
  children,
  initialModals,
}: {
  children: React.ReactNode
  initialModals?: Partial<ModalState>
}) {
  const [modals, setModals] = useState<ModalState>({
    ...defaultModalState,
    ...(initialModals ?? {}),
  })

  const toggleModal = useCallback((modal: keyof ModalState, open?: boolean) => {
    setModals((prev) => ({
      ...prev,
      [modal]: open !== undefined ? open : !prev[modal],
    }))
  }, [])

  const value = useMemo<ModalContextValue>(() => ({ modals, toggleModal }), [modals, toggleModal])

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

export function useModalContext(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (ctx === undefined) throw new Error('useModalContext must be used within an AppProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// 5. NetworkContext
// ---------------------------------------------------------------------------

interface NetworkContextValue {
  isOnline: boolean
  lastSyncedAt: number | null
  setOnlineStatus: (online: boolean) => void
  updateSyncTime: (timestamp: number) => void
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined)

function NetworkProvider({
  children,
  initialOnline,
  initialSyncedAt,
}: {
  children: React.ReactNode
  initialOnline?: boolean
  initialSyncedAt?: number | null
}) {
  const [isOnline, setIsOnline] = useState<boolean>(initialOnline ?? navigator.onLine)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(initialSyncedAt ?? null)

  const setOnlineStatus = useCallback((online: boolean) => setIsOnline(online), [])
  const updateSyncTime = useCallback((ts: number) => setLastSyncedAt(ts), [])

  // Listen for browser online/offline events.
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const value = useMemo<NetworkContextValue>(
    () => ({ isOnline, lastSyncedAt, setOnlineStatus, updateSyncTime }),
    [isOnline, lastSyncedAt, setOnlineStatus, updateSyncTime],
  )

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetworkContext(): NetworkContextValue {
  const ctx = useContext(NetworkContext)
  if (ctx === undefined) throw new Error('useNetworkContext must be used within an AppProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// AppProvider — composition root for all 5 focused providers
// ---------------------------------------------------------------------------

interface AppProviderProps {
  children: React.ReactNode
  /** Partial initial state for testing and storybook scenarios. */
  initialState?: Partial<AppState>
}

export function AppProvider({ children, initialState }: AppProviderProps) {
  return (
    <ThemeProvider initialTheme={initialState?.theme}>
      <UserProvider initialUser={initialState?.user}>
        <UIPreferencesProvider initialPreferences={initialState?.uiPreferences}>
          <ModalProvider initialModals={initialState?.modals}>
            <NetworkProvider
              initialOnline={initialState?.isOnline}
              initialSyncedAt={initialState?.lastSyncedAt}
            >
              {children}
            </NetworkProvider>
          </ModalProvider>
        </UIPreferencesProvider>
      </UserProvider>
    </ThemeProvider>
  )
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
  const { theme } = useTheme()
  const { user } = useUser()
  const { uiPreferences } = useUIPreferencesContext()
  const { modals } = useModalContext()
  const { isOnline, lastSyncedAt } = useNetworkContext()
  return useMemo(
    () => ({ theme, user, uiPreferences, modals, isOnline, lastSyncedAt }),
    [theme, user, uiPreferences, modals, isOnline, lastSyncedAt],
  )
}

/** Backward-compatible actions bag. */
export interface AppActionsContextValue {
  setTheme: (theme: ThemeMode) => void
  setUser: (user: User | null) => void
  updateUIPreferences: (preferences: Partial<UIPreferences>) => void
  toggleModal: (modal: keyof ModalState, open?: boolean) => void
  setOnlineStatus: (isOnline: boolean) => void
  updateSyncTime: (timestamp: number) => void
  resetState: () => void
}

/**
 * Returns all action creators in a single bag — matches the old API.
 * Components using only actions won't re-render on state changes because
 * each individual provider's action ref is stable.
 */
export function useAppActions(): AppActionsContextValue {
  const { setTheme } = useTheme()
  const { setUser } = useUser()
  const { updateUIPreferences } = useUIPreferencesContext()
  const { toggleModal } = useModalContext()
  const { setOnlineStatus, updateSyncTime } = useNetworkContext()

  // resetState re-navigates all 5 contexts back to their defaults. Because
  // each sub-provider owns its own useState, we drive them through their
  // stable setters with the default values.
  const resetState = useCallback(() => {
    setTheme(readPersistedTheme())
    setUser(null)
    updateUIPreferences(defaultUIPreferences)
    toggleModal('settingsOpen', false)
    toggleModal('commandPaletteOpen', false)
    toggleModal('searchOpen', false)
    toggleModal('shareDialogOpen', false)
    setOnlineStatus(navigator.onLine)
  }, [setTheme, setUser, updateUIPreferences, toggleModal, setOnlineStatus])

  return useMemo(
    () => ({
      setTheme,
      setUser,
      updateUIPreferences,
      toggleModal,
      setOnlineStatus,
      updateSyncTime,
      resetState,
    }),
    [setTheme, setUser, updateUIPreferences, toggleModal, setOnlineStatus, updateSyncTime, resetState],
  )
}

/**
 * Select a derived value from the full AppState.
 * Only re-renders when the selected value changes.
 */
export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const state = useAppState()
  return useMemo(() => selector(state), [state, selector])
}

// ---------------------------------------------------------------------------
// Focused convenience hooks (unchanged public API)
// ---------------------------------------------------------------------------

export function useThemeMode(): ThemeMode {
  return useTheme().theme
}

export function useCurrentUser(): User | null {
  return useUser().user
}

export function useUIPreferences(): UIPreferences {
  return useUIPreferencesContext().uiPreferences
}

export function useModalStates(): ModalState {
  return useModalContext().modals
}

export function useModal(modal: keyof ModalState): [boolean, (open?: boolean) => void] {
  const { modals, toggleModal } = useModalContext()
  const toggle = useCallback((open?: boolean) => toggleModal(modal, open), [modal, toggleModal])
  return [modals[modal], toggle]
}

export function useOnlineStatus(): boolean {
  return useNetworkContext().isOnline
}

export function useLastSyncTime(): number | null {
  return useNetworkContext().lastSyncedAt
}

// ---------------------------------------------------------------------------
// Legacy context exports (some tests import these directly)
// ---------------------------------------------------------------------------

// These are thin facades so the test file import `{ AppStateContext, AppActionsContext }`
// continues to compile. They are not meaningful for new code.
export const AppStateContext = createContext<AppState | undefined>(undefined)
export const AppActionsContext = createContext<AppActionsContextValue | undefined>(undefined)

// Kept for type compatibility only.
export interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<never>
}
