# App Context System

A performance-optimized React Context system for managing app-wide UI state, complementing the existing Redux setup.

## Overview

This context system is designed to work alongside Redux, not replace it. Use this for:

- **UI preferences** (sidebar state, modal states, editor settings)
- **Theme preferences**
- **User session data**
- **Transient UI state** that doesn't need Redux middleware or time-travel debugging

Continue using **Redux** for:

- Document/post data
- Complex async operations with sagas
- Data that needs middleware processing
- Features requiring time-travel debugging

## Architecture

The context is split into two separate contexts for optimal performance:

1. **AppStateContext** - For reading state (causes re-renders on state changes)
2. **AppActionsContext** - For dispatching actions (does not cause re-renders)

This separation ensures components only re-render when the specific state they depend on changes.

## Basic Usage

### 1. Reading State

```tsx
import { useAppState, useAppSelector } from '@/contexts'

// Option A: Get entire state (re-renders on any state change)
function MyComponent() {
  const state = useAppState()
  return <div>{state.theme}</div>
}

// Option B: Select specific value (re-renders only when that value changes) - RECOMMENDED
function MyComponent() {
  const theme = useAppSelector(state => state.theme)
  return <div>{theme}</div>
}
```

### 2. Dispatching Actions

```tsx
import { useAppActions } from '@/contexts'

function ThemeToggle() {
  const { setTheme } = useAppActions()

  return (
    <button onClick={() => setTheme('dark')}>
      Switch to Dark Mode
    </button>
  )
}
```

### 3. Combined Usage

```tsx
import { useAppSelector, useAppActions } from '@/contexts'

function ThemeToggle() {
  const theme = useAppSelector(state => state.theme)
  const { setTheme } = useAppActions()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button onClick={toggleTheme}>
      Current: {theme}
    </button>
  )
}
```

## Convenience Hooks

The context provides specialized hooks for common use cases:

### Theme Management

```tsx
import { useThemeMode, useAppActions } from '@/contexts'

function ThemeSelector() {
  const currentTheme = useThemeMode()
  const { setTheme } = useAppActions()

  return (
    <select value={currentTheme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  )
}
```

### User Data

```tsx
import { useCurrentUser, useAppActions } from '@/contexts'

function UserProfile() {
  const user = useCurrentUser()
  const { setUser } = useAppActions()

  if (!user) {
    return <button onClick={() => setUser({ id: '1', name: 'John', email: 'john@example.com' })}>
      Sign In
    </button>
  }

  return <div>Welcome, {user.name}</div>
}
```

### Modal Management

```tsx
import { useModal } from '@/contexts'

function SettingsButton() {
  const [isOpen, toggleSettings] = useModal('settingsOpen')

  return (
    <>
      <button onClick={() => toggleSettings(true)}>Open Settings</button>
      {isOpen && <SettingsModal onClose={() => toggleSettings(false)} />}
    </>
  )
}
```

### UI Preferences

```tsx
import { useUIPreferences, useAppActions } from '@/contexts'

function EditorSettings() {
  const preferences = useUIPreferences()
  const { updateUIPreferences } = useAppActions()

  return (
    <div>
      <label>
        Font Size: {preferences.editorFontSize}px
        <input
          type="range"
          min="12"
          max="24"
          value={preferences.editorFontSize}
          onChange={(e) => updateUIPreferences({ editorFontSize: Number(e.target.value) })}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={preferences.showLineNumbers}
          onChange={(e) => updateUIPreferences({ showLineNumbers: e.target.checked })}
        />
        Show Line Numbers
      </label>
    </div>
  )
}
```

### Online Status

```tsx
import { useOnlineStatus } from '@/contexts'

function OnlineIndicator() {
  const isOnline = useOnlineStatus()

  return (
    <div className={isOnline ? 'text-green-500' : 'text-red-500'}>
      {isOnline ? '● Online' : '● Offline'}
    </div>
  )
}
```

## Available Actions

All actions are accessible via `useAppActions()`:

```tsx
const {
  setTheme,              // (theme: ThemeMode) => void
  setUser,               // (user: User | null) => void
  updateUIPreferences,   // (preferences: Partial<UIPreferences>) => void
  toggleModal,           // (modal: keyof ModalState, open?: boolean) => void
  setOnlineStatus,       // (isOnline: boolean) => void
  updateSyncTime,        // (timestamp: number) => void
  resetState            // () => void
} = useAppActions()
```

## Performance Optimization Tips

### 1. Use Selector Hooks for Specific Values

**Bad** - Re-renders on any state change:
```tsx
function MyComponent() {
  const state = useAppState()
  return <div>{state.theme}</div>
}
```

**Good** - Only re-renders when theme changes:
```tsx
function MyComponent() {
  const theme = useThemeMode()
  return <div>{theme}</div>
}
```

### 2. Separate Read and Write Components

If a component only dispatches actions without reading state, use only `useAppActions()`:

```tsx
function ActionButton() {
  const { setTheme } = useAppActions() // No re-renders!

  return <button onClick={() => setTheme('dark')}>Dark Mode</button>
}
```

### 3. Memoize Selectors for Complex Computations

```tsx
import { useAppSelector } from '@/contexts'
import { useMemo } from 'react'

function MyComponent() {
  const expensiveValue = useAppSelector(state => {
    // This selector runs on every state change
    return computeExpensiveValue(state)
  })

  // Better: memoize the computation
  const memoizedValue = useMemo(
    () => computeExpensiveValue(expensiveValue),
    [expensiveValue]
  )

  return <div>{memoizedValue}</div>
}
```

## State Persistence

UI preferences are automatically persisted to `localStorage` and restored on app startup. This includes:

- Sidebar state
- Compact mode
- Editor font size and line height
- Line numbers visibility
- Spell check settings

No additional code is needed for persistence.

## Type Safety

All types are fully typed with TypeScript:

```tsx
import type {
  ThemeMode,
  User,
  UIPreferences,
  ModalState,
  AppState
} from '@/contexts'

// Types are automatically inferred
const theme: ThemeMode = useThemeMode() // 'light' | 'dark' | 'system'
const user: User | null = useCurrentUser()
const prefs: UIPreferences = useUIPreferences()
```

## Testing

When testing components that use the context, wrap them in the provider:

```tsx
import { render } from '@testing-library/react'
import { AppProvider } from '@/contexts'

test('renders theme correctly', () => {
  render(
    <AppProvider initialState={{ theme: 'dark' }}>
      <YourComponent />
    </AppProvider>
  )

  // Your assertions here
})
```

## Migration from Redux

If you have UI state in Redux that would be better in context:

1. Keep the Redux state temporarily
2. Add the state to AppContext
3. Update components to use context hooks
4. Remove from Redux once all components are migrated
5. No need to migrate all at once - both can coexist

## Common Patterns

### Modal with Custom State

```tsx
function ShareDialog() {
  const [isOpen, toggleDialog] = useModal('shareDialogOpen')
  const [shareUrl, setShareUrl] = useState('')

  return (
    <Dialog open={isOpen} onOpenChange={toggleDialog}>
      <DialogContent>
        <input
          value={shareUrl}
          onChange={(e) => setShareUrl(e.target.value)}
          placeholder="Share URL"
        />
      </DialogContent>
    </Dialog>
  )
}
```

### Conditional Rendering Based on Multiple State Values

```tsx
function AdvancedSettings() {
  const user = useCurrentUser()
  const preferences = useUIPreferences()

  // Only show advanced settings for users with certain preferences
  if (!user || !preferences.compactMode) {
    return null
  }

  return <div>Advanced Options...</div>
}
```

### Sync State with Main Process

```tsx
function ThemeSync() {
  const theme = useThemeMode()
  const { setTheme } = useAppActions()

  useEffect(() => {
    // Listen for theme changes from main process
    const cleanup = window.api.onThemeChange((newTheme: string) => {
      setTheme(newTheme as ThemeMode)
    })

    return cleanup
  }, [setTheme])

  return null // This component just handles syncing
}
```

## Available Modal States

The following modal states are built-in:

- `settingsOpen` - Settings dialog
- `commandPaletteOpen` - Command palette
- `searchOpen` - Search dialog
- `shareDialogOpen` - Share dialog

Add new modals by updating the `ModalState` type in `AppContext.tsx`.
