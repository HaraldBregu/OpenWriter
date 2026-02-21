# Quick Start Guide: AppContext

Get up and running with the AppContext system in 5 minutes.

## Installation

Already installed! The AppProvider is integrated in `/src/renderer/src/App.tsx`.

## Basic Usage

### 1. Import What You Need

```typescript
import { useThemeMode, useAppActions } from '@/contexts'
```

### 2. Read State

```typescript
function MyComponent() {
  const theme = useThemeMode()
  return <div>Current theme: {theme}</div>
}
```

### 3. Update State

```typescript
function ThemeButton() {
  const { setTheme } = useAppActions()
  return <button onClick={() => setTheme('dark')}>Dark Mode</button>
}
```

### 4. Combined (Read + Write)

```typescript
function ThemeToggle() {
  const theme = useThemeMode()
  const { setTheme } = useAppActions()

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <button onClick={toggle}>Toggle ({theme})</button>
}
```

## Common Patterns

### Theme Management

```typescript
import { useThemeMode, useAppActions } from '@/contexts'

const theme = useThemeMode()                    // Get theme
const { setTheme } = useAppActions()
setTheme('dark')                                 // Set theme
```

### User Session

```typescript
import { useCurrentUser, useAppActions } from '@/contexts'

const user = useCurrentUser()                    // Get user
const { setUser } = useAppActions()
setUser({ id: '1', name: 'John', email: '...' }) // Login
setUser(null)                                    // Logout
```

### Modal States

```typescript
import { useModal } from '@/contexts'

const [isOpen, toggle] = useModal('settingsOpen')

toggle(true)   // Open
toggle(false)  // Close
toggle()       // Toggle
```

### UI Preferences

```typescript
import { useUIPreferences, useAppActions } from '@/contexts'

const prefs = useUIPreferences()
const { updateUIPreferences } = useAppActions()

updateUIPreferences({ editorFontSize: 16 })      // Update one
updateUIPreferences({                            // Update multiple
  editorFontSize: 16,
  showLineNumbers: true
})
```

### Online Status

```typescript
import { useOnlineStatus } from '@/contexts'

const isOnline = useOnlineStatus()  // Auto-tracked!

return <div>{isOnline ? 'Online' : 'Offline'}</div>
```

## Available Hooks

### Reading State

| Hook | Returns | Re-renders When |
|------|---------|-----------------|
| `useThemeMode()` | `ThemeMode` | Theme changes |
| `useCurrentUser()` | `User \| null` | User changes |
| `useUIPreferences()` | `UIPreferences` | Any preference changes |
| `useModal(name)` | `[boolean, (open?: boolean) => void]` | That modal changes |
| `useOnlineStatus()` | `boolean` | Network status changes |
| `useLastSyncTime()` | `number \| null` | Sync time changes |

### Updating State

```typescript
const actions = useAppActions()

actions.setTheme(theme)
actions.setUser(user)
actions.updateUIPreferences(prefs)
actions.toggleModal(modal, open?)
actions.updateSyncTime(timestamp)
actions.resetState()
```

## Performance Tips

### ✅ Good: Use Specific Hooks

```typescript
const theme = useThemeMode()  // Only re-renders when theme changes
```

### ❌ Avoid: Using Full State

```typescript
const state = useAppState()   // Re-renders on ANY state change
const theme = state.theme
```

### ✅ Good: Action-Only Components

```typescript
function SaveButton() {
  const { updateSyncTime } = useAppActions()  // Never re-renders!
  return <button onClick={() => updateSyncTime(Date.now())}>Save</button>
}
```

## Common Recipes

### Keyboard Shortcut Handler

```typescript
import { useEffect } from 'react'
import { useAppActions } from '@/contexts'

function KeyboardShortcuts() {
  const { toggleModal } = useAppActions()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleModal('commandPaletteOpen')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleModal])

  return null
}
```

### Conditional Rendering

```typescript
import { useCurrentUser } from '@/contexts'

function ProtectedContent() {
  const user = useCurrentUser()

  if (!user) {
    return <LoginPrompt />
  }

  return <SecureContent />
}
```

### Sync with External State

```typescript
import { useEffect } from 'react'
import { useAppActions } from '@/contexts'

function ElectronThemeSync() {
  const { setTheme } = useAppActions()

  useEffect(() => {
    // Listen to theme changes from Electron main process
    const cleanup = window.api.onThemeChange((theme) => {
      setTheme(theme)
    })

    return cleanup
  }, [setTheme])

  return null
}
```

### Loading State

```typescript
import { useCurrentUser } from '@/contexts'

function UserAvatar() {
  const user = useCurrentUser()

  if (!user) {
    return <div className="skeleton" />
  }

  return <img src={user.avatar} alt={user.name} />
}
```

## TypeScript

All hooks are fully typed:

```typescript
import type { ThemeMode, User, UIPreferences } from '@/contexts'

const theme: ThemeMode = useThemeMode()        // 'light' | 'dark' | 'system'
const user: User | null = useCurrentUser()
const prefs: UIPreferences = useUIPreferences()
```

## Testing

```typescript
import { render } from '@testing-library/react'
import { AppProvider } from '@/contexts'

test('component works', () => {
  render(
    <AppProvider initialState={{ theme: 'dark' }}>
      <YourComponent />
    </AppProvider>
  )

  // Your assertions
})
```

## Adding New State

Need to add new state? Edit `AppContext.tsx`:

```typescript
// 1. Add to AppState interface
export interface AppState {
  // ... existing
  myNewState: string
}

// 2. Add to initialState
const initialState: AppState = {
  // ... existing
  myNewState: 'default'
}

// 3. Add action type
type AppAction =
  | { type: 'SET_MY_STATE'; payload: string }
  // ... existing

// 4. Add to reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MY_STATE':
      return { ...state, myNewState: action.payload }
    // ... existing
  }
}

// 5. Add action creator
const actions = useMemo(
  () => ({
    // ... existing
    setMyState: (value: string) =>
      dispatch({ type: 'SET_MY_STATE', payload: value })
  }),
  []
)

// 6. Add convenience hook (optional)
export function useMyState(): string {
  return useAppSelector((state) => state.myNewState)
}
```

Then export from `index.ts` and use it!

## When to Use This vs Redux

Use **AppContext** for:
- UI state (modals, tooltips, dropdowns)
- User preferences (theme, settings)
- Session data (current user)
- Simple state that doesn't need middleware

Use **Redux** for:
- Document data (posts, messages)
- Complex async operations
- State needing middleware
- Time-travel debugging

## Need More Help?

- Full documentation: `README.md`
- Migration guide: `MIGRATION_GUIDE.md`
- Examples: `/components/examples/`
- Tests: `__tests__/AppContext.test.tsx`

## Cheat Sheet

```typescript
// Read state
import { useThemeMode, useCurrentUser, useUIPreferences, useModal, useOnlineStatus } from '@/contexts'

const theme = useThemeMode()
const user = useCurrentUser()
const prefs = useUIPreferences()
const [isOpen, toggle] = useModal('settingsOpen')
const isOnline = useOnlineStatus()

// Write state
import { useAppActions } from '@/contexts'

const {
  setTheme,
  setUser,
  updateUIPreferences,
  toggleModal,
  updateSyncTime,
  resetState
} = useAppActions()

// TypeScript types
import type { ThemeMode, User, UIPreferences, ModalState, AppState } from '@/contexts'
```

That's it! Start using it in your components.
