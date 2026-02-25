# Migration Guide: Redux to AppContext

This guide helps you decide when to use Redux vs AppContext and how to migrate state between them.

## Decision Framework

### Use Redux For:

- **Document/Content Data**: Posts, notes, messages, writings
- **Data requiring persistence**: Must survive page refreshes
- **Complex async operations**: Data fetched from APIs
- **Data needing middleware**: Validation, transformation, side effects
- **Features needing time-travel debugging**: Undo/redo functionality
- **Shared data mutations**: Multiple components modifying the same data
- **Cross-component data flow**: Parent-child-sibling communication patterns

### Use AppContext For:

- **UI State**: Modal visibility, sidebar state, dropdown states
- **User Preferences**: Theme, editor settings, view preferences
- **Session Data**: Current user, authentication status
- **Transient State**: Form states, temporary selections
- **Feature Flags**: UI toggles, experimental features
- **Simple synchronous state**: No async operations needed

## Migration Steps

### Step 1: Identify Candidates

Look for Redux slices that contain primarily UI state:

```typescript
// Example: UI state that should move to Context
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  modalStates: Record<string, boolean>
}
```

### Step 2: Add to AppContext Types

Update `/Users/haraldbregu/Documents/9Spartans/apps/openwriter/src/renderer/src/contexts/AppContext.tsx`:

```typescript
// Add your new state to the AppState interface
export interface AppState {
  // ... existing state
  yourNewState: YourNewType
}

// Add action type
type AppAction =
  | { type: 'SET_YOUR_STATE'; payload: YourNewType }
  // ... other actions

// Add to reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_YOUR_STATE':
      return { ...state, yourNewState: action.payload }
    // ... other cases
  }
}

// Add action creator
const actions = useMemo<AppActionsContextValue>(
  () => ({
    // ... existing actions
    setYourState: (value: YourNewType) =>
      dispatch({ type: 'SET_YOUR_STATE', payload: value })
  }),
  []
)

// Add convenience hook
export function useYourState(): YourNewType {
  return useAppSelector((state) => state.yourNewState)
}
```

### Step 3: Create Migration Path

Don't migrate everything at once. Use both systems during transition:

```typescript
// Phase 1: Duplicate the state (Redux + Context)
function MyComponent() {
  const reduxValue = useAppSelector(state => state.ui.theme) // Old
  const contextValue = useThemeMode() // New

  // Use Redux value, but also set Context
  useEffect(() => {
    if (reduxValue !== contextValue) {
      setTheme(reduxValue)
    }
  }, [reduxValue, contextValue])
}

// Phase 2: Switch to Context
function MyComponent() {
  const theme = useThemeMode() // Only Context
  // Remove Redux dependency
}

// Phase 3: Remove from Redux
// Delete the Redux slice/actions after all components migrated
```

### Step 4: Update Components

Gradually update components to use Context:

```typescript
// Before: Redux
import { useAppSelector, useAppDispatch } from '@/store'
import { setTheme } from '@/store/uiSlice'

function ThemeToggle() {
  const theme = useAppSelector(state => state.ui.theme)
  const dispatch = useAppDispatch()

  return (
    <button onClick={() => dispatch(setTheme('dark'))}>
      {theme}
    </button>
  )
}

// After: Context
import { useThemeMode, useAppActions } from '@/contexts'

function ThemeToggle() {
  const theme = useThemeMode()
  const { setTheme } = useAppActions()

  return (
    <button onClick={() => setTheme('dark')}>
      {theme}
    </button>
  )
}
```

### Step 5: Clean Up Redux

After all components are migrated:

1. Remove the Redux slice
2. Remove from store configuration
3. Remove action creators
4. Remove selectors
5. Update tests

## Real-World Example: Migrating Sidebar State

### Current State (Redux)

```typescript
// store/uiSlice.ts
interface UIState {
  sidebarOpen: boolean
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    }
  }
})
```

### Target State (Context)

Already built into AppContext as `UIPreferences.sidebarState`!

### Migration Steps

#### 1. Update AppLayout Component

```typescript
// Before
import { useAppSelector, useAppDispatch } from '@/store'
import { toggleSidebar } from '@/store/uiSlice'

function AppLayout() {
  const sidebarOpen = useAppSelector(state => state.ui.sidebarOpen)
  const dispatch = useAppDispatch()

  return (
    <div>
      <button onClick={() => dispatch(toggleSidebar())}>
        Toggle
      </button>
      {sidebarOpen && <Sidebar />}
    </div>
  )
}

// After
import { useUIPreferences, useAppActions } from '@/contexts'

function AppLayout() {
  const { sidebarState } = useUIPreferences()
  const { updateUIPreferences } = useAppActions()

  const toggleSidebar = () => {
    updateUIPreferences({
      sidebarState: sidebarState === 'expanded' ? 'collapsed' : 'expanded'
    })
  }

  return (
    <div>
      <button onClick={toggleSidebar}>
        Toggle
      </button>
      {sidebarState === 'expanded' && <Sidebar />}
    </div>
  )
}
```

#### 2. Update All Components Using Sidebar State

Use find-and-replace or IDE refactoring tools:

```bash
# Find components using the old pattern
grep -r "state.ui.sidebarOpen" src/

# Update each one to use Context instead
```

#### 3. Remove from Redux

```typescript
// store/index.ts
export const store = configureStore({
  reducer: {
    // Remove: ui: uiReducer,
    posts: postsReducer,
    chat: chatReducer
  }
})

// Delete: store/uiSlice.ts
```

## Performance Comparison

### Redux
- **Pros**: Powerful DevTools, middleware, time-travel debugging
- **Cons**: More boilerplate, can cause unnecessary re-renders if not optimized
- **Best for**: Complex state, async operations

### AppContext
- **Pros**: Simple, less boilerplate, split contexts prevent unnecessary re-renders
- **Cons**: No time-travel debugging, limited middleware support
- **Best for**: UI state, preferences, simple synchronous state

## Testing After Migration

### Redux Test (Before)

```typescript
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import uiReducer from '@/store/uiSlice'

test('toggles sidebar', () => {
  const store = configureStore({
    reducer: { ui: uiReducer }
  })

  render(
    <Provider store={store}>
      <AppLayout />
    </Provider>
  )

  // Test assertions
})
```

### Context Test (After)

```typescript
import { render } from '@testing-library/react'
import { AppProvider } from '@/contexts'

test('toggles sidebar', () => {
  render(
    <AppProvider initialState={{ uiPreferences: { sidebarState: 'expanded' } }}>
      <AppLayout />
    </AppProvider>
  )

  // Test assertions
})
```

## Rollback Plan

If you encounter issues during migration:

1. **Keep Redux code**: Don't delete Redux code until fully migrated
2. **Feature flag**: Use environment variables to toggle between implementations
3. **Gradual rollout**: Migrate one component at a time
4. **Monitor**: Watch for performance regressions

```typescript
// Hybrid approach during migration
function MyComponent() {
  const useNewContext = process.env.VITE_USE_APP_CONTEXT === 'true'

  const themeFromRedux = useAppSelector(state => state.ui.theme)
  const themeFromContext = useThemeMode()

  const theme = useNewContext ? themeFromContext : themeFromRedux

  return <div>{theme}</div>
}
```

## Common Pitfalls

### 1. Migrating Too Much at Once

**Problem**: Moving all state to Context in one go causes bugs

**Solution**: Migrate incrementally, one slice at a time

### 2. Not Optimizing Context Reads

**Problem**: Using `useAppState()` everywhere causes unnecessary re-renders

**Solution**: Use selective hooks like `useThemeMode()`, `useUIPreferences()`

### 3. Keeping Duplicate State

**Problem**: Maintaining state in both Redux and Context

**Solution**: Set a deadline to remove Redux state after migration

### 4. Missing Persistence

**Problem**: Context state doesn't persist by default

**Solution**: AppContext auto-persists UI preferences to localStorage. Add custom persistence for other state if needed.

## Questions to Ask Before Migrating

1. **Does this state need to persist across sessions?**
   - If yes: Consider keeping in Redux with persistence middleware
   - If no: Context is fine

2. **Do multiple components modify this state?**
   - If yes: Redux might be better for predictable updates
   - If no: Context is simpler

3. **Do you need time-travel debugging for this state?**
   - If yes: Keep in Redux
   - If no: Context is fine

4. **Is this state tied to async operations?**
   - If yes: Redux with sagas/thunks is more powerful
   - If no: Context is simpler

5. **Is this purely UI state?**
   - If yes: Definitely migrate to Context
   - If no: Consider Redux

## Getting Help

If you're unsure whether to migrate state:

1. Check the decision framework above
2. Review the examples in `/src/renderer/src/components/examples/`
3. Test with a small, non-critical feature first
4. Monitor performance before and after

## Summary Checklist

- [ ] Identify state to migrate
- [ ] Add types to AppContext
- [ ] Create migration plan
- [ ] Update components incrementally
- [ ] Test thoroughly
- [ ] Remove Redux code
- [ ] Update tests
- [ ] Document changes
