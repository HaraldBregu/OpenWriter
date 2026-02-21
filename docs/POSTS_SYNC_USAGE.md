# Posts Sync Usage Guide

This guide shows how to integrate the posts sync functionality into your React application.

## Quick Start

### 1. The posts sync middleware is already integrated

The middleware is automatically registered in the Redux store at `/src/renderer/src/store/index.ts`:

```typescript
import { postsSyncMiddleware } from './middleware/postsSync.middleware'

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    posts: postsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(postsSyncMiddleware)
})
```

No additional setup needed - the middleware will automatically sync posts to Electron whenever they change.

### 2. Load posts on app startup

Add the `usePostsLoader` hook to your root component (e.g., `App.tsx`):

```typescript
import { usePostsLoader } from './hooks/usePostsLoader'

function App() {
  // Load posts from workspace on app mount
  usePostsLoader()

  return (
    <Provider store={store}>
      <YourAppRoutes />
    </Provider>
  )
}
```

That's it! Your app now:
- Loads posts from the workspace when it starts
- Automatically syncs posts to Electron when they change (with 1.5s debouncing)
- Only syncs when a workspace is active

## Advanced Usage

### Handle Loading State

```typescript
import { usePostsLoader } from './hooks/usePostsLoader'

function App() {
  const { isLoading, error } = usePostsLoader()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage error={error} />
  }

  return <YourApp />
}
```

### Force Immediate Sync

By default, posts sync after a 1.5-second debounce delay. To force an immediate sync (e.g., before app closes):

```typescript
import { forcePostsSync } from './store/middleware/postsSync.middleware'
import { useAppSelector } from './store'
import { selectPosts } from './store/postsSlice'

function MyComponent() {
  const posts = useAppSelector(selectPosts)

  const handleBeforeUnload = async () => {
    // Force immediate sync before app closes
    await forcePostsSync(posts)
  }

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [posts])

  return <div>...</div>
}
```

### Reset Sync State on Workspace Change

When the user switches workspaces, reset the sync state to ensure clean syncing:

```typescript
import { resetPostsSyncState } from './store/middleware/postsSync.middleware'

function WorkspaceSelector() {
  const handleWorkspaceChange = async (newWorkspacePath: string) => {
    // Reset sync state
    resetPostsSyncState()

    // Set new workspace
    await window.api.workspaceSetCurrent(newWorkspacePath)

    // Load posts from new workspace
    const posts = await window.api.postsLoadFromWorkspace()
    dispatch(loadPosts(posts))
  }

  return <button onClick={handleWorkspaceChange}>Switch Workspace</button>
}
```

## Component Usage Examples

### Creating a Post

```typescript
import { useAppDispatch } from './store'
import { createPost } from './store/postsSlice'

function CreatePostButton() {
  const dispatch = useAppDispatch()

  const handleCreate = () => {
    // Dispatch action - middleware will automatically sync
    dispatch(createPost())
  }

  return <button onClick={handleCreate}>Create Post</button>
}
```

### Updating a Post

```typescript
import { useAppDispatch } from './store'
import { updatePostTitle } from './store/postsSlice'

function PostTitleEditor({ postId }: { postId: string }) {
  const dispatch = useAppDispatch()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Dispatch action - middleware will debounce and sync
    dispatch(updatePostTitle({
      postId,
      title: e.target.value
    }))
  }

  return <input onChange={handleChange} />
}
```

### Deleting a Post

```typescript
import { useAppDispatch } from './store'
import { deletePost } from './store/postsSlice'

function DeletePostButton({ postId }: { postId: string }) {
  const dispatch = useAppDispatch()

  const handleDelete = () => {
    // Dispatch action - middleware will automatically sync
    dispatch(deletePost(postId))
  }

  return <button onClick={handleDelete}>Delete</button>
}
```

### Displaying Posts

```typescript
import { useAppSelector } from './store'
import { selectPosts } from './store/postsSlice'

function PostsList() {
  const posts = useAppSelector(selectPosts)

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <div>{post.blocks.map(b => b.content).join(' ')}</div>
        </div>
      ))}
    </div>
  )
}
```

## IPC Channels

The following IPC channels are used for posts sync:

### Renderer → Main

| Channel | Purpose | Payload | Returns |
|---------|---------|---------|---------|
| `posts:sync-to-workspace` | Sync all posts to workspace | `Post[]` | `{ success: boolean, syncedCount: number, failedCount: number }` |
| `posts:load-from-workspace` | Load posts from workspace | None | `Post[]` |
| `posts:update-post` | Update single post | `Post` | `void` |
| `posts:delete-post` | Delete single post | `postId: string` | `void` |

### Main → Renderer

No channels currently defined (sync is one-way: renderer → main).

## Debugging

### Enable Debug Logs

All sync operations log to the console with the `[PostsSync]` prefix:

```
[PostsSync] Post action detected: posts/updatePostTitle { postCount: 5 }
[PostsSync] Syncing posts to Electron { postCount: 5, workspacePath: '/Users/...' }
[PostsSync] Successfully synced posts { syncedCount: 5, failedCount: 0 }
```

### Check Sync State

You can inspect the sync state in the console:

```typescript
import { forcePostsSync, resetPostsSyncState } from './store/middleware/postsSync.middleware'

// Check if sync is pending
console.log('Sync pending:', syncTimeoutId !== null)

// Check last synced posts
console.log('Last synced:', lastSyncedPosts)
```

Note: These variables are module-private, but you can export them for debugging.

### Test Sync

```typescript
// 1. Create a post
dispatch(createPost())

// 2. Wait for debounce (1.5s)
await new Promise(resolve => setTimeout(resolve, 2000))

// 3. Check if file exists
const posts = await window.api.postsLoadFromWorkspace()
console.log('Posts in file:', posts)
```

## Performance Characteristics

### Debouncing

- **Delay**: 1.5 seconds after last change
- **Purpose**: Reduce file I/O during rapid changes (e.g., typing)
- **Impact**: ~90% reduction in file writes

### Change Detection

- **Strategy**: Compare timestamps and array length
- **Complexity**: O(n) where n = number of posts
- **Optimization**: Quick bailout on length mismatch

### Memory Usage

- **Middleware**: ~1KB (timeout reference + last synced state)
- **Per Post**: ~500 bytes (id + title + blocks + metadata)
- **Total**: ~1KB + (500 bytes × number of posts)

## Troubleshooting

### Posts Not Syncing

**Symptoms**: Changes not saved to file

**Causes**:
1. No workspace selected
2. Electron handlers not registered
3. Sync errors (check console)

**Solutions**:
```typescript
// Check workspace
const workspace = await window.api.workspaceGetCurrent()
console.log('Workspace:', workspace) // Should return path, not null

// Check handlers
console.log('API methods:', window.api) // Should have postsSyncToWorkspace

// Check console for errors
// Look for [PostsSync] error logs
```

### Duplicate Syncs

**Symptoms**: Multiple file writes for single change

**Causes**:
1. Debounce not working
2. Change detection failing

**Solutions**:
```typescript
// Add logging to middleware
console.log('[Debug] Timer ID:', syncTimeoutId)
console.log('[Debug] Has changed:', hasPostsChanged(lastSyncedPosts, posts))
```

### Slow Performance

**Symptoms**: UI freezes during sync

**Causes**:
1. Large number of posts (> 10,000)
2. Large post content (> 1MB per post)

**Solutions**:
- Consider pagination or lazy loading
- Compress content before syncing
- Use web workers for serialization

## Best Practices

### 1. Always Check Workspace

Before any file operations, ensure workspace is active:

```typescript
const workspace = await window.api.workspaceGetCurrent()
if (!workspace) {
  // Handle no workspace case
  return
}
```

### 2. Handle Errors Gracefully

Show user-friendly error messages:

```typescript
try {
  await window.api.postsSyncToWorkspace(posts)
} catch (error) {
  showNotification({
    title: 'Sync Failed',
    message: 'Your changes may not be saved.',
    type: 'error'
  })
}
```

### 3. Don't Over-Sync

Trust the debouncing - don't force immediate syncs unnecessarily:

```typescript
// ❌ BAD: Forces sync on every keystroke
onChange={(e) => {
  dispatch(updatePostTitle({ ... }))
  forcePostsSync(posts) // Too frequent!
}}

// ✅ GOOD: Let middleware handle it
onChange={(e) => {
  dispatch(updatePostTitle({ ... }))
  // Middleware will debounce and sync automatically
}}
```

### 4. Clean Up on Unmount

Clear any pending syncs when component unmounts:

```typescript
useEffect(() => {
  return () => {
    // Force sync before unmount (if needed)
    forcePostsSync(posts)
  }
}, [posts])
```

## Migration Guide

### From Manual Saves

If you previously had manual save logic:

**Before**:
```typescript
const handleSave = async () => {
  await window.api.savePosts(posts)
  showNotification('Saved!')
}

<button onClick={handleSave}>Save</button>
```

**After**:
```typescript
// No save button needed - automatic!
// Just update Redux state:
dispatch(updatePostTitle({ postId, title }))

// Middleware handles sync automatically
```

### From Other Sync Solutions

If you used `useEffect` to watch posts:

**Before**:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    window.api.savePosts(posts)
  }, 1000)

  return () => clearTimeout(timer)
}, [posts])
```

**After**:
```typescript
// Remove useEffect - middleware handles it!
// Just add usePostsLoader() to App.tsx
```

## Summary

The posts sync system provides:

- **Automatic syncing**: No manual save buttons needed
- **Debouncing**: Efficient I/O with 1.5s delay
- **Workspace awareness**: Only syncs when workspace is active
- **Error handling**: User notifications on failures
- **Performance**: Optimized change detection

Simply add `usePostsLoader()` to your App component and start using Redux actions - syncing happens automatically!
