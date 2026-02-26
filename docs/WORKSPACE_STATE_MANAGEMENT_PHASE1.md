# Workspace State Management - Phase 1 Implementation

**Date**: February 26, 2026
**Status**: Complete ✅
**Scope**: Redux centralization + IPC event synchronization

## Overview

Phase 1 establishes a centralized, event-driven workspace state management system in the OpenWriter renderer. Previously, workspace state was scattered across 6+ components with independent IPC calls. This caused:

- ❌ Multiple independent `window.workspace.getCurrent()` calls
- ❌ No workspace change event propagation
- ❌ Stale UI state when workspace switched
- ❌ Memory leak in WorkspaceMetadataService EventBus listener

Phase 1 eliminates these issues by:

- ✅ Creating a Redux slice as the single source of truth
- ✅ Implementing a main → renderer event broadcast system
- ✅ Fixing the EventBus memory leak
- ✅ Integrating state into AppLayout for app-wide consistency

---

## Architecture

### 1. Main Process (Electron)

```
┌─────────────────────────────────────────┐
│      WorkspaceService                   │
│  - Manages current workspace path       │
│  - Emits 'workspace:changed' event      │
│  - Broadcasts to all renderer windows   │
└──────────┬──────────────────────────────┘
           │
           │ ipcMain.handle('workspace-*')
           │
┌──────────▼──────────────────────────────┐
│      WorkspaceIpc                       │
│  - Route handlers (delegates to service)│
│  - Window-scoped for per-window state   │
└──────────┬──────────────────────────────┘
           │
           │ broadcast('workspace:changed', event)
           │
           ▼
     All Renderer Windows
```

### 2. Renderer Process (React/Redux)

```
┌─────────────────────────────────────────┐
│    window.workspace.onChange(callback)  │
│  - Listens for main process broadcasts  │
│  - Fires in useWorkspaceListener hook   │
└──────────┬──────────────────────────────┘
           │
           │ dispatch(handleWorkspaceChanged(event))
           │
┌──────────▼──────────────────────────────┐
│      workspaceSlice (Redux)             │
│  - currentPath: string | null           │
│  - recentWorkspaces: WorkspaceInfo[]    │
│  - status: 'idle' | 'loading' | ...     │
│  - error: string | null                 │
└──────────┬──────────────────────────────┘
           │
           │ useAppSelector(selectCurrentWorkspacePath)
           │ useAppSelector(selectWorkspaceName)
           │
           ▼
     React Components (AppLayout, etc.)
```

---

## Files Changed

### Shared Types

#### `src/shared/types/ipc/types.ts`
```typescript
// NEW: Event payload type
export interface WorkspaceChangedEvent {
  currentPath: string | null
  previousPath: string | null
}
```

#### `src/shared/types/ipc/channels.ts`
```typescript
// Added to WorkspaceChannels
changed: 'workspace:changed'

// Added to EventChannelMap
[WorkspaceChannels.changed]: { data: WorkspaceChangedEvent }
```

### Preload Bridge

#### `src/preload/index.d.ts`
```typescript
export interface WorkspaceApi {
  // ... existing methods ...
  onChange: (callback: (event: WorkspaceChangedEvent) => void) => () => void
}
```

#### `src/preload/index.ts`
```typescript
const workspace: WorkspaceApi = {
  // ... existing methods ...
  onChange: (callback) => typedOn(WorkspaceChannels.changed, callback)
}
```

### Main Process

#### `src/main/services/workspace.ts`
```typescript
setCurrent(directoryPath: string): void {
  // ... validation ...
  const previousPath = this.currentPath
  this.currentPath = normalized
  this.openedAt = Date.now()

  this.store.setCurrentWorkspace(normalized)

  // Emit internal event for main process listeners
  this.eventBus.emit('workspace:changed', { currentPath: normalized, previousPath })

  // NEW: Broadcast to all renderer windows
  this.eventBus.broadcast('workspace:changed', {
    currentPath: normalized,
    previousPath
  })
}
```

#### `src/main/services/workspace-metadata.ts` (Memory Leak Fix)
```typescript
// ADDED: Store unsubscribe function
private workspaceEventUnsubscribe: (() => void) | null = null

initialize(): void {
  // ... existing code ...

  // FIXED: Capture and store unsubscribe function
  this.workspaceEventUnsubscribe = this.eventBus.on('workspace:changed', (event) => {
    const payload = event.payload as { currentPath: string | null; previousPath: string | null }
    this.handleWorkspaceChanged(payload.currentPath)
  })
}

destroy(): void {
  // NEW: Cleanup listener to prevent memory leak
  if (this.workspaceEventUnsubscribe) {
    this.workspaceEventUnsubscribe()
    this.workspaceEventUnsubscribe = null
  }
  this.flush()
  console.log('[WorkspaceMetadataService] Destroyed')
}
```

### Renderer Redux

#### `src/renderer/src/store/workspaceSlice.ts` (NEW)

Complete implementation with:

**State Shape**:
```typescript
interface WorkspaceState {
  currentPath: string | null
  recentWorkspaces: WorkspaceInfo[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}
```

**Async Thunks**:
- `loadCurrentWorkspace()` — Hydrate from main process on app startup
- `loadRecentWorkspaces()` — Load recent workspaces list
- `selectWorkspace(path)` — Set workspace to path
- `openWorkspacePicker()` — Show folder picker dialog
- `removeRecentWorkspace(path)` — Remove from recent list
- `clearWorkspace()` — Clear current workspace

**Actions**:
- `handleWorkspaceChanged(event)` — Sync main process event to Redux

**Selectors**:
```typescript
selectCurrentWorkspacePath(state) → string | null
selectHasWorkspace(state) → boolean
selectWorkspaceName(state) → string | null  // folder basename
selectRecentWorkspaces(state) → WorkspaceInfo[]
selectWorkspaceStatus(state) → 'idle' | 'loading' | 'ready' | 'error'
selectWorkspaceError(state) → string | null
selectWorkspaceIsLoading(state) → boolean
```

#### `src/renderer/src/store/index.ts`
```typescript
import workspaceReducer from './workspaceSlice'

export const store = configureStore({
  reducer: {
    // ... other reducers ...
    workspace: workspaceReducer
  }
})
```

### Renderer Hooks

#### `src/renderer/src/hooks/useWorkspaceListener.ts` (NEW)

```typescript
export function useWorkspaceListener(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubscribe = window.workspace.onChange((event) => {
      dispatch(handleWorkspaceChanged(event))
    })
    return () => unsubscribe()
  }, [dispatch])
}
```

Sets up the event listener once per component mount. Should be called from `AppLayout` to ensure app-wide coverage.

### React Components

#### `src/renderer/src/components/AppLayout.tsx`

**Changes**:
1. Import workspace selectors and hooks
2. Call `useWorkspaceListener()` to activate event listener
3. Call `dispatch(loadCurrentWorkspace())` on mount
4. Select `selectWorkspaceName` from Redux instead of calling IPC directly
5. TitleBar updates automatically when workspace path changes

```typescript
function AppLayoutInner({ children }: AppLayoutProps) {
  const dispatch = useAppDispatch()
  const workspaceNameFromPath = useAppSelector(selectWorkspaceName)

  // Listen for workspace changes from main process
  useWorkspaceListener()

  // Hydrate workspace state on app startup
  useEffect(() => {
    dispatch(loadCurrentWorkspace())
  }, [dispatch])

  const displayWorkspaceName = workspaceNameFromPath
    ? `${workspaceNameFromPath} (workspace)`
    : "OpenWriter"

  return (
    <>
      <TitleBar title={displayWorkspaceName} onToggleSidebar={toggleSidebar} />
      {/* ... rest of layout ... */}
    </>
  )
}
```

---

## Data Flow Examples

### Example 1: User Switches Workspace

```
1. User clicks "Open Folder" in WelcomePage
   └─> window.workspace.selectFolder()

2. User selects directory
   └─> WelcomePage calls dispatch(selectWorkspace(path))

3. selectWorkspace thunk:
   └─> window.workspace.setCurrent(path)  ┐
                                           ├─ IPC call to main
                                           └─> WorkspaceService.setCurrent()

4. Main process (WorkspaceService):
   ├─> Validate path
   ├─> Update in-memory state
   ├─> Persist to StoreService
   ├─> Emit 'workspace:changed' event (main process listeners)
   └─> broadcast('workspace:changed', event)  ── to all renderer windows

5. Renderer receives broadcast:
   └─> window.workspace.onChange(callback) triggers
       └─> dispatch(handleWorkspaceChanged(event))
           └─> Update Redux state

6. React re-renders AppLayout:
   ├─> selectWorkspaceName selector returns new folder name
   └─> TitleBar updates with new workspace name
```

### Example 2: External Directory Changes Detected

```
1. User adds indexed directory to workspace (via RAG UI)

2. WorkspaceMetadataService:
   ├─> Emit 'directories:changed' internal event
   └─> broadcast('directories:changed', dirs)  ── to all renderers

3. Renderer receives event:
   └─> DirectoriesPage updates directory list
```

---

## Migration Path for Existing Components

### Before (Anti-pattern)
```typescript
// ❌ WRONG: Multiple independent IPC calls
function SomeComponent() {
  const [workspace, setWorkspace] = useState<string | null>(null)

  useEffect(() => {
    window.workspace.getCurrent().then(setWorkspace)
  }, [])

  return <div>{workspace}</div>
}
```

### After (Best practice)
```typescript
// ✅ CORRECT: Use Redux selector
import { useAppSelector } from '@/store'
import { selectCurrentWorkspacePath } from '@/store/workspaceSlice'

function SomeComponent() {
  const workspace = useAppSelector(selectCurrentWorkspacePath)
  return <div>{workspace}</div>
}
```

### Components to Update (Phase 2)
These components currently call `window.workspace.getCurrent()` directly and should be refactored:

1. **WelcomePage.tsx** — Use `selectWorkspaceName` for display
2. **GeneralSettings.tsx** — Use `selectCurrentWorkspacePath` for path display
3. **postsSync middleware** — Use selector instead of IPC call
4. **useOutputFiles.ts** — Use selector instead of IPC call
5. **usePostsLoader.ts** — Use selector instead of IPC call

---

## TypeScript Types

### Event Type
```typescript
interface WorkspaceChangedEvent {
  currentPath: string | null
  previousPath: string | null
}
```

### State Type
```typescript
interface WorkspaceState {
  currentPath: string | null
  recentWorkspaces: WorkspaceInfo[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}
```

### Preload API Extension
```typescript
interface WorkspaceApi {
  selectFolder: () => Promise<string | null>
  getCurrent: () => Promise<string | null>
  setCurrent: (workspacePath: string) => Promise<void>
  getRecent: () => Promise<WorkspaceInfo[]>
  clear: () => Promise<void>
  directoryExists: (directoryPath: string) => Promise<boolean>
  removeRecent: (workspacePath: string) => Promise<void>
  onChange: (callback: (event: WorkspaceChangedEvent) => void) => () => void  // NEW
}
```

---

## Testing Checklist

### Manual Testing
- [ ] Open app → workspace name displays in title bar
- [ ] Click "Open Folder" in welcome → workspace switches, title updates
- [ ] Switch workspace → all pages reflect new workspace state
- [ ] Close window → workspace persists on app restart
- [ ] Open second window → both windows sync workspace changes
- [ ] Add/remove indexed directories → lists update across windows

### Unit Tests (Future)
- [ ] workspaceSlice reducers
- [ ] workspaceSlice selectors
- [ ] useWorkspaceListener hook
- [ ] WorkspaceService.setCurrent/clear emit events
- [ ] WorkspaceIpc handlers return correct types

### Integration Tests (Future)
- [ ] Workspace selection → EventBus broadcast → Redux update
- [ ] WorkspaceMetadataService cleanup on destroy
- [ ] Multi-window workspace synchronization

---

## Breaking Changes & Migrations

### None for Phase 1
- All changes are additive
- Existing IPC calls still work (backward compatible)
- No API signatures changed, only extended

### Deprecations (Phase 2)
- Components should stop calling `window.workspace.getCurrent()` directly
- Migrate to Redux selectors: `selectCurrentWorkspacePath`, `selectWorkspaceName`

---

## Performance Considerations

1. **Redux Slice Size**: WorkspaceState is small (~100-200 bytes) → minimal overhead
2. **Event Broadcasting**: All windows receive `workspace:changed` → efficient (native Electron)
3. **Memory**: Listener cleanup in WorkspaceMetadataService prevents leaks
4. **Selectors**: Memoized via `createSelector()` → efficient re-renders

---

## Future Enhancements (Phase 2+)

1. **Workspace Initialization** (`workspace:create` channel)
   - Initialize `workspace.tsrct` metadata file
   - Create subdirectories: `posts/`, `documents/`, `personality/`, `output/`

2. **Workspace Metadata Exposure** (`workspace:getMetadata` channel)
   - Return workspace name, creation date, indexed directories
   - Enable richer UI

3. **In-Session Workspace Switching**
   - Add `WorkspaceSwitcher` component to sidebar
   - Use `selectWorkspace` thunk
   - No need to quit and relaunch

4. **Polling Optimization**
   - Use native fs events (ReadDirectoryChangesW) instead of polling
   - Only use polling for network paths (UNC)

5. **Directory Watcher Consolidation**
   - Extract shared `BaseWatcherService` to eliminate code duplication
   - Hoist directory watcher to `AppLayout` for session-wide coverage

---

## Files Summary

| File | Type | Status |
|------|------|--------|
| `src/shared/types/ipc/types.ts` | Modified | +`WorkspaceChangedEvent` |
| `src/shared/types/ipc/channels.ts` | Modified | +`changed` channel, event mapping |
| `src/preload/index.d.ts` | Modified | +`onChange` method |
| `src/preload/index.ts` | Modified | +`onChange` implementation |
| `src/main/services/workspace.ts` | Modified | +broadcast calls |
| `src/main/services/workspace-metadata.ts` | Modified | Memory leak fix |
| `src/renderer/src/store/workspaceSlice.ts` | New | Complete Redux slice |
| `src/renderer/src/store/index.ts` | Modified | +workspace reducer |
| `src/renderer/src/hooks/useWorkspaceListener.ts` | New | Event listener hook |
| `src/renderer/src/components/AppLayout.tsx` | Modified | Integrated workspace state |

---

## References

- **Redux Toolkit**: `createAsyncThunk`, `createSlice`, `createSelector`
- **Electron IPC**: `ipcMain.handle`, `webContents.send`
- **TypeScript**: Strict typing for shared types across process boundaries
- **EventBus**: Main process event coordination pattern

---

## Conclusion

Phase 1 establishes a robust foundation for workspace state management. The centralized Redux slice eliminates scattered IPC calls, the event broadcast system ensures multi-window synchronization, and the fixed memory leak improves stability. Components can now rely on a single source of truth for workspace state, enabling better UI consistency and future features like in-session workspace switching.
