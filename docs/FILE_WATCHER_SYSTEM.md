# File Watcher System Documentation

## Overview

The File Watcher System automatically synchronizes posts between the file system and the application state. When post files are created, modified, or deleted externally (outside the app), the system detects these changes and updates the UI in real-time.

## Architecture

### Main Process (Electron)

#### FileWatcherService (`src/main/services/file-watcher.ts`)

**Responsibilities:**
- Monitors the `{workspace}/posts/` directory for `.json` file changes
- Detects file creation, modification, and deletion events
- Broadcasts changes to renderer via EventBus
- Prevents infinite loops by tracking app-generated writes
- Handles workspace changes (start/stop watching)
- Debounces rapid changes for performance
- Gracefully handles errors with proper cleanup

**Key Features:**
- Uses `chokidar` library for reliable cross-platform file watching
- Integrates with `WorkspaceService` via EventBus events (`workspace:changed`)
- Tracks recently written files to prevent feedback loops (2-second ignore window)
- Debounces file changes (300ms) to batch rapid modifications
- Atomic file watching with stabilization detection

**Lifecycle:**
1. Service is registered in bootstrap (`src/main/bootstrap.ts`)
2. Listens to `workspace:changed` events
3. Starts watching when workspace is set
4. Stops watching when workspace changes or app closes
5. Cleanup on destroy

**Configuration:**
```typescript
{
  pattern: '*.json',           // File pattern to watch
  debounceMs: 300,            // Debounce delay in ms
  ignoreWriteWindowMs: 2000   // Ignore window after write in ms
}
```

#### PostsIpc Integration (`src/main/ipc/PostsIpc.ts`)

**Changes:**
- Marks files as "app-written" before writing them
- Passes `FileWatcherService` reference to write operations
- Prevents watcher from emitting events for app-generated changes

**Before writing a file:**
```typescript
if (fileWatcher) {
  fileWatcher.markFileAsWritten(filePath)
}
// ... write file ...
```

### Renderer Process (React)

#### usePostsFileWatcher Hook (`src/renderer/src/hooks/usePostsFileWatcher.ts`)

**Responsibilities:**
- Listens for `posts:file-changed` and `posts:watcher-error` IPC events
- Reloads affected posts from disk when changed
- Dispatches Redux actions to update the store
- Shows user notifications for external changes
- Handles errors gracefully

**Usage:**
```typescript
function AppLayout() {
  usePostsLoader()        // Load initial posts
  usePostsFileWatcher()   // Listen for external changes
  return <YourApp />
}
```

#### Redux Integration (`src/renderer/src/store/postsSlice.ts`)

**New Actions:**
- `handleExternalPostChange(post)` - Updates/adds externally modified post
- `handleExternalPostDelete(postId)` - Removes externally deleted post

**Posts Sync Middleware (`src/renderer/src/store/middleware/postsSync.middleware.ts`)**

**Changes:**
- Skips syncing for external change actions
- Prevents infinite loops by ignoring:
  - `posts/handleExternalPostChange`
  - `posts/handleExternalPostDelete`
  - `posts/loadPosts`

### IPC Bridge (Preload)

#### New IPC Methods (`src/preload/index.ts`, `src/preload/index.d.ts`)

**Event Listeners:**
```typescript
// Listen for file changes
window.api.onPostsFileChange((event) => {
  // event.type: 'added' | 'changed' | 'removed'
  // event.postId: string
  // event.filePath: string
  // event.timestamp: number
})

// Listen for watcher errors
window.api.onPostsWatcherError((error) => {
  // error.error: string
  // error.timestamp: number
})
```

## Event Flow

### External File Change (User edits file outside app)

```
1. User edits /workspace/posts/abc123.json externally
2. Chokidar detects file change
3. FileWatcherService validates (not recently written by app)
4. FileWatcherService debounces the event (300ms)
5. EventBus broadcasts 'posts:file-changed' to renderer
6. Renderer receives IPC event via preload
7. usePostsFileWatcher hook handles event
8. Hook reloads post from workspace
9. Dispatches handleExternalPostChange action
10. Redux store updates
11. UI re-renders with new data
12. User sees notification: "Post modified externally"
```

### App-Generated File Change (User edits in app)

```
1. User edits post in app UI
2. Redux action dispatched (e.g., updatePostTitle)
3. postsSyncMiddleware intercepts action
4. Middleware debounces sync (1.5s)
5. Calls window.api.postsSyncToWorkspace()
6. PostsIpc marks file as written: fileWatcher.markFileAsWritten(path)
7. PostsIpc writes file to disk
8. Chokidar detects file change
9. FileWatcherService checks if recently written by app
10. Event is IGNORED (in 2s ignore window)
11. No infinite loop!
```

### Workspace Change

```
1. User selects new workspace
2. WorkspaceService broadcasts 'workspace:changed'
3. FileWatcherService stops old watcher
4. FileWatcherService starts new watcher for new workspace
5. Renderer reloads posts from new workspace
```

## Infinite Loop Prevention

The system uses multiple layers to prevent infinite loops:

1. **File Marking (Main Process)**
   - Before writing, `PostsIpc` marks files with `fileWatcher.markFileAsWritten(path)`
   - FileWatcherService ignores changes to marked files for 2 seconds
   - Prevents: App write → Watcher detects → App write → ...

2. **Action Filtering (Renderer)**
   - `postsSyncMiddleware` skips external change actions
   - Prevents: External change → Sync to disk → External change → ...

3. **Debouncing**
   - FileWatcherService debounces changes (300ms)
   - postsSyncMiddleware debounces syncs (1.5s)
   - Prevents: Rapid changes → Excessive I/O

## Performance Optimizations

### FileWatcherService
- `ignoreInitial: true` - Don't emit events for existing files
- `awaitWriteFinish` - Wait for file stabilization (100ms)
- `depth: 0` - Only watch posts directory, not subdirectories
- `usePolling: false` - Use native file system events (faster)
- `alwaysStat: false` - Don't stat files unless needed
- Ignored patterns: Dotfiles (`/(^|[\/\\])\.../`)

### PostsIpc
- 5-second cache for `postsLoadFromWorkspace()`
- Atomic writes with temporary files
- Batch sync operations with `Promise.allSettled()`

### Renderer
- Debounced sync (1.5s) in middleware
- Change detection to skip unnecessary syncs
- Memoized selectors in Redux

## Error Handling

### File System Errors
- **Permission denied** - User notification with clear message
- **Disk full** - Specific error message
- **Directory doesn't exist** - Gracefully creates directory
- **File not found** - Idempotent delete (no error)

### Watcher Errors
- Logged to console
- Broadcast to renderer via `posts:watcher-error`
- User notification shown
- Watcher continues running (no crash)

### Edge Cases Handled
1. **Rapid Changes** - Debounced and batched
2. **App-Generated Changes** - Ignored via file marking
3. **Workspace Switch** - Clean stop/start of watcher
4. **File Conflicts** - User notified, can manually refresh
5. **Missing Directory** - Created automatically
6. **Permission Errors** - Clear error messages
7. **Large Files** - Atomic writes prevent corruption
8. **App Shutdown** - Proper cleanup of watchers

## Testing Scenarios

### Manual Testing

1. **External File Creation**
   ```bash
   # While app is running
   echo '{"id":"test123","title":"Test","blocks":[],"category":"technology","tags":[],"visibility":"public","createdAt":1234567890,"updatedAt":1234567890}' > workspace/posts/test123.json
   # Expected: Post appears in app UI, notification shown
   ```

2. **External File Modification**
   ```bash
   # Edit existing post file externally
   # Expected: Post updates in app UI, notification shown
   ```

3. **External File Deletion**
   ```bash
   rm workspace/posts/test123.json
   # Expected: Post removed from app UI, notification shown
   ```

4. **App-Generated Change**
   ```typescript
   // Edit post in app
   // Expected: File updated, no notification, no infinite loop
   ```

5. **Workspace Change**
   ```typescript
   // Select different workspace
   // Expected: Old watcher stops, new watcher starts, posts reloaded
   ```

### Performance Testing

- **100+ Posts**: System handles gracefully
- **Rapid Changes**: Debouncing prevents excessive I/O
- **Concurrent Changes**: Both app and external changes work
- **Large Files**: Atomic writes prevent corruption

## Configuration

### Adjust Debounce Timing

**File Watcher (Main Process):**
```typescript
// In bootstrap.ts or service initialization
fileWatcher.updateConfig({
  debounceMs: 500,           // Increase for slower systems
  ignoreWriteWindowMs: 3000  // Increase for slower disk writes
})
```

**Posts Sync (Renderer):**
```typescript
// In postsSync.middleware.ts
const SYNC_DEBOUNCE_MS = 2000  // Increase to reduce I/O
```

### Disable File Watcher

**Option 1: Don't register service**
```typescript
// In bootstrap.ts
// Comment out:
// container.register('fileWatcher', new FileWatcherService(eventBus))
```

**Option 2: Don't use hook**
```typescript
// In AppLayout.tsx
// Comment out:
// usePostsFileWatcher()
```

## Troubleshooting

### Watcher Not Detecting Changes

**Check:**
1. Is workspace selected? (`window.api.workspaceGetCurrent()`)
2. Is posts directory created? Check `workspace/posts/` exists
3. Check console for watcher errors
4. Verify file permissions on posts directory

**Debug:**
```typescript
// In FileWatcherService
console.log('[FileWatcherService] Watcher ready:', this.currentDirectory)
console.log('[FileWatcherService] File change detected:', event)
```

### Infinite Loop Detected

**Check:**
1. Is `fileWatcher.markFileAsWritten()` called before writes?
2. Is `postsSyncMiddleware` filtering external actions?
3. Check ignore window timing (2s default)

**Debug:**
```typescript
// In FileWatcherService
console.log('[FileWatcherService] Ignoring app-generated change:', filePath)
```

### Performance Issues

**Check:**
1. Number of posts in directory (100+ may need optimization)
2. Debounce timings (increase if too frequent)
3. File system performance (SSD vs HDD)

**Optimize:**
- Increase debounce delays
- Use file system snapshots for large directories
- Consider pagination for 1000+ posts

## Dependencies

- **chokidar** (^5.0.0) - File system watcher
  - Cross-platform
  - Reliable
  - Performance optimized
  - Industry standard for Electron apps

## Future Enhancements

1. **Conflict Resolution UI**
   - Show diff when file edited externally and locally
   - Let user choose which version to keep

2. **Batch Notifications**
   - Group multiple changes into single notification
   - "3 posts updated externally"

3. **File System Snapshots**
   - Cache file metadata to detect changes faster
   - Reduce disk I/O for large directories

4. **Selective Watching**
   - Only watch files currently viewed
   - Reduce resource usage for 1000+ posts

5. **Real-time Collaboration**
   - Integrate with file sync services (Dropbox, OneDrive)
   - Show which files are being edited by others

## References

- [Chokidar Documentation](https://github.com/paulmillr/chokidar)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Redux Middleware Guide](https://redux.js.org/tutorials/fundamentals/part-4-store#middleware)
