# Posts Sync Architecture

This document describes the React/Redux implementation for synchronizing posts to Electron's main process.

## Overview

The posts sync system automatically saves posts from the Redux store to the workspace directory via Electron IPC. It implements debouncing to prevent excessive file writes during rapid changes (e.g., while typing).

## Architecture Components

### 1. Redux Middleware (`postsSync.middleware.ts`)

**Location**: `/src/renderer/src/store/middleware/postsSync.middleware.ts`

**Purpose**: Intercepts all Redux actions and triggers sync when post-related actions are dispatched.

**Key Features**:
- **Action Detection**: Monitors all actions with `posts/` prefix
- **Debouncing**: 1.5-second delay after last change before syncing
- **Workspace Validation**: Only syncs when a workspace is active
- **Change Detection**: Compares post timestamps to avoid redundant syncs
- **Error Handling**: Shows user notifications on sync failures

**Why Middleware?**
- Centralized: Single point of control for all post changes
- Action-agnostic: Works with any post action without modification
- Testable: Easy to unit test in isolation
- Performance: Minimal overhead, runs on every action but quick to filter

**Alternatives Considered**:
1. **useEffect Hook**: Would require placement in multiple components, harder to maintain
2. **Redux Saga**: More complex setup, overkill for simple side effect
3. **Direct IPC calls**: Scattered throughout codebase, hard to track and debug

### 2. Redux Actions (`postsSlice.ts`)

**New Action Added**: `loadPosts`

```typescript
loadPosts(state, action: PayloadAction<Post[]>) {
  state.posts = action.payload
}
```

**Purpose**: Bulk load posts from Electron when app starts or workspace changes.

**Existing Actions**:
- `createPost` - Creates new post
- `updatePostBlocks` - Updates post content
- `updatePostTitle` - Updates post title
- `updatePostCategory` - Updates post category
- `updatePostTags` - Updates post tags
- `updatePostVisibility` - Updates post visibility
- `deletePost` - Deletes post

All these actions trigger the sync middleware automatically.

### 3. IPC Type Definitions

**Files**:
- `/src/preload/index.ts` - Implementation
- `/src/preload/index.d.ts` - TypeScript types

**New Methods**:

```typescript
// Save posts to workspace
workspaceSyncPosts(posts: Post[]): Promise<void>

// Load posts from workspace
workspaceLoadPosts(): Promise<Post[]>
```

**Channel Names** (for Electron implementation):
- `workspace:sync-posts` - Save posts to file
- `workspace:load-posts` - Load posts from file

### 4. Custom Hooks (`usePostsLoader.ts`)

**Location**: `/src/renderer/src/hooks/usePostsLoader.ts`

**Hooks**:

#### `usePostsLoader()`
- Loads posts from workspace on app mount
- Prevents duplicate loads with ref flags
- Handles errors gracefully
- Returns loading state and error

#### `useWorkspaceChangeHandler()`
- Listens for workspace changes
- Resets sync state when workspace changes
- Loads posts from new workspace

**Usage**:
```typescript
// In App.tsx or root component
function App() {
  usePostsLoader() // Load posts on mount

  return <YourApp />
}
```

## Data Flow

### Sync Flow (Redux → Electron)

```
1. User edits post
   ↓
2. Component dispatches action (e.g., updatePostTitle)
   ↓
3. Reducer updates Redux state
   ↓
4. Middleware detects action (type starts with 'posts/')
   ↓
5. Middleware starts 1.5s debounce timer
   ↓
6. [User continues editing, timer resets on each change]
   ↓
7. Timer expires (1.5s after last change)
   ↓
8. Middleware checks:
   - Is workspace active? (via workspaceGetCurrent)
   - Have posts changed? (compares timestamps)
   ↓
9. If yes, call workspaceSyncPosts(posts)
   ↓
10. Electron saves posts to file
   ↓
11. Success: Update lastSyncedPosts
    Error: Show notification to user
```

### Load Flow (Electron → Redux)

```
1. App mounts
   ↓
2. usePostsLoader hook runs
   ↓
3. Check if workspace is active (via workspaceGetCurrent)
   ↓
4. If yes, call workspaceLoadPosts()
   ↓
5. Electron reads posts from file
   ↓
6. Dispatch loadPosts(posts) action
   ↓
7. Redux store is populated
   ↓
8. UI re-renders with loaded posts
```

## Debouncing Strategy

**Delay**: 1.5 seconds (1500ms)

**Why 1.5 seconds?**
- **Too short** (< 1s): Excessive file I/O, wears out SSD, impacts performance
- **Too long** (> 3s): User might close app before sync, data loss risk
- **1.5s**: Sweet spot - feels instant to user, reduces I/O by ~90%

**Example**:
```
User types: "Hello World"
  H     → Start timer (1.5s)
  e     → Reset timer (1.5s)
  l     → Reset timer (1.5s)
  l     → Reset timer (1.5s)
  o     → Reset timer (1.5s)
  [space] → Reset timer (1.5s)
  W     → Reset timer (1.5s)
  o     → Reset timer (1.5s)
  r     → Reset timer (1.5s)
  l     → Reset timer (1.5s)
  d     → Reset timer (1.5s)
  [user stops typing]
  ... 1.5s ...
  → SYNC! (Only 1 file write instead of 11)
```

## Change Detection

**Optimization**: Avoid redundant syncs when state hasn't changed.

**Strategy**:
```typescript
function hasPostsChanged(prevPosts: Post[] | null, currentPosts: Post[]): boolean {
  // Quick checks first
  if (!prevPosts) return true
  if (prevPosts.length !== currentPosts.length) return true

  // Deep check: Compare timestamps
  for (let i = 0; i < currentPosts.length; i++) {
    if (prev.updatedAt !== current.updatedAt) {
      return true
    }
  }

  return false
}
```

**Why not JSON.stringify?**
- Performance: Stringifying large objects is slow
- Memory: Creates temporary string copies
- Timestamps: Already unique per change

## Error Handling

### Sync Errors

**Scenarios**:
- Workspace directory deleted
- Disk full
- Permission denied
- Network drive disconnected

**Handling**:
```typescript
try {
  await window.api.workspaceSyncPosts(posts)
  lastSyncedPosts = [...posts]
} catch (error) {
  console.error('[PostsSync] Failed to sync:', error)

  // Show user notification
  await window.api.notificationShow({
    title: 'Sync Failed',
    body: 'Failed to save posts to workspace.',
    urgency: 'critical'
  })
}
```

### Load Errors

**Scenarios**:
- File doesn't exist (first launch)
- Corrupted JSON
- Permission denied

**Handling**:
```typescript
try {
  const posts = await window.api.workspaceLoadPosts()
  dispatch(loadPosts(posts))
} catch (error) {
  // Silent fail for ENOENT (expected on first launch)
  if (!error.message.includes('ENOENT')) {
    await window.api.notificationShow({
      title: 'Load Failed',
      body: 'Failed to load posts from workspace.',
      urgency: 'normal'
    })
  }
}
```

## Workspace Integration

**Requirement**: Only sync when workspace is active.

**Implementation**:
```typescript
async function syncPostsToElectron(posts: Post[]): Promise<void> {
  // Check workspace
  const workspacePath = await window.api.workspaceGetCurrent()

  if (!workspacePath) {
    console.debug('[PostsSync] No workspace, skipping sync')
    return // Silent fail, no error
  }

  // Proceed with sync...
}
```

**Why?**
- Prevents errors when no workspace is selected
- User might be browsing without a project
- Welcome screen doesn't need sync

## State Management

### Sync State

```typescript
// Debounce timer
let syncTimeoutId: ReturnType<typeof setTimeout> | null = null

// Last synced posts (for change detection)
let lastSyncedPosts: Post[] | null = null
```

### Reset on Workspace Change

```typescript
export function resetPostsSyncState(): void {
  lastSyncedPosts = null

  if (syncTimeoutId !== null) {
    clearTimeout(syncTimeoutId)
    syncTimeoutId = null
  }
}
```

**When to reset**:
- User switches workspace
- User closes workspace
- App shutdown (clear pending timers)

## Memory Management

### Potential Memory Leaks

**1. Timeout Leak**:
```typescript
// ❌ BAD: Creates new timeout without clearing old one
setTimeout(() => sync(), 1500)
setTimeout(() => sync(), 1500) // Leak!

// ✅ GOOD: Clear before creating new
if (syncTimeoutId) clearTimeout(syncTimeoutId)
syncTimeoutId = setTimeout(() => sync(), 1500)
```

**2. Reference Leak**:
```typescript
// ❌ BAD: Keeps reference to old posts forever
lastSyncedPosts = posts

// ✅ GOOD: Copy array, allows GC of old posts
lastSyncedPosts = [...posts]
```

### Performance Optimizations

**1. Quick Bailout**:
```typescript
// Check length first (O(1) operation)
if (prevPosts.length !== currentPosts.length) return true

// Then check timestamps (O(n) but fast)
for (let i = 0; i < currentPosts.length; i++) {
  if (prev.updatedAt !== current.updatedAt) return true
}
```

**2. Avoid Serialization**:
```typescript
// ❌ BAD: Expensive operation
JSON.stringify(posts) === JSON.stringify(lastSyncedPosts)

// ✅ GOOD: Compare timestamps only
prev.updatedAt !== current.updatedAt
```

## Testing Strategy

### Unit Tests (Middleware)

```typescript
describe('postsSyncMiddleware', () => {
  it('should sync on post creation', async () => {
    const store = mockStore({ posts: { posts: [] } })
    store.dispatch(createPost())

    await waitForDebounce()

    expect(window.api.workspaceSyncPosts).toHaveBeenCalled()
  })

  it('should debounce rapid changes', async () => {
    const store = mockStore({ posts: { posts: [] } })

    store.dispatch(updatePostTitle({ postId: '1', title: 'A' }))
    store.dispatch(updatePostTitle({ postId: '1', title: 'AB' }))
    store.dispatch(updatePostTitle({ postId: '1', title: 'ABC' }))

    await waitForDebounce()

    // Only 1 sync call, not 3
    expect(window.api.workspaceSyncPosts).toHaveBeenCalledTimes(1)
  })

  it('should skip sync when no workspace', async () => {
    window.api.workspaceGetCurrent.mockResolvedValue(null)

    const store = mockStore({ posts: { posts: [] } })
    store.dispatch(createPost())

    await waitForDebounce()

    expect(window.api.workspaceSyncPosts).not.toHaveBeenCalled()
  })
})
```

### Integration Tests

```typescript
describe('Posts Sync Integration', () => {
  it('should load posts on app mount', async () => {
    const mockPosts = [{ id: '1', title: 'Test', ... }]
    window.api.workspaceLoadPosts.mockResolvedValue(mockPosts)

    const { result } = renderHook(() => usePostsLoader())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const state = store.getState()
    expect(state.posts.posts).toEqual(mockPosts)
  })
})
```

## Coordination with Electron Implementation

### Channel Names

**Sync Posts**: `workspace:sync-posts`
**Load Posts**: `workspace:load-posts`

### Expected Main Process Implementation

```typescript
// In main/index.ts or main/handlers/workspace.ts
ipcMain.handle('workspace:sync-posts', async (event, posts: Post[]) => {
  const workspacePath = store.get('currentWorkspace')
  const filePath = path.join(workspacePath, 'posts.json')

  await fs.writeFile(filePath, JSON.stringify(posts, null, 2))

  return { success: true }
})

ipcMain.handle('workspace:load-posts', async (event) => {
  const workspacePath = store.get('currentWorkspace')
  const filePath = path.join(workspacePath, 'posts.json')

  const data = await fs.readFile(filePath, 'utf-8')
  const posts = JSON.parse(data)

  return { success: true, data: posts }
})
```

### File Format

**Location**: `{workspacePath}/posts.json`

**Structure**:
```json
[
  {
    "id": "abc123",
    "title": "My First Post",
    "blocks": [
      { "id": "block1", "content": "Hello world" }
    ],
    "category": "technology",
    "tags": ["react", "typescript"],
    "visibility": "public",
    "createdAt": 1706745600000,
    "updatedAt": 1706745600000
  }
]
```

## Future Improvements

### 1. Conflict Resolution
- Detect file changes from external sources
- Merge changes or prompt user
- Last-write-wins strategy

### 2. Auto-save Indicator
- Show "Saving..." indicator during sync
- Show "Saved" checkmark on success
- Show error icon on failure

### 3. Offline Support
- Queue syncs when offline
- Retry failed syncs
- Show pending sync count

### 4. Performance Monitoring
- Track sync duration
- Log slow syncs (> 500ms)
- Alert on repeated failures

### 5. Workspace Events
- Listen for workspace changes via IPC
- Auto-reload posts on workspace switch
- Clear posts on workspace close

## Troubleshooting

### Posts Not Syncing

**Check**:
1. Is workspace selected? (`workspaceGetCurrent` returns path)
2. Console logs showing sync attempts?
3. Electron handlers registered?
4. File permissions on workspace directory?

### Duplicate Syncs

**Check**:
1. Multiple middleware instances?
2. Debounce timer being cleared prematurely?
3. Change detection logic failing?

### Memory Leaks

**Check**:
1. Timeout being cleared on cleanup?
2. Old posts references being released?
3. Middleware not removed on unmount?

## Summary

This implementation provides a robust, performant, and user-friendly posts sync system. Key benefits:

- **Automatic**: No manual save required
- **Efficient**: Debouncing reduces I/O by ~90%
- **Safe**: Workspace validation prevents errors
- **Fast**: Change detection avoids redundant syncs
- **Resilient**: Error handling with user feedback

The middleware approach centralizes all sync logic, making it easy to maintain and extend. The debouncing strategy balances responsiveness with performance, ensuring a smooth user experience while minimizing disk wear.
