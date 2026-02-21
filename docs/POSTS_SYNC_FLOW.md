# Posts Sync Data Flow Diagrams

## Overview

This document provides visual representations of the posts sync system's data flow.

## 1. Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │  Component   │────────>│    Redux     │                    │
│  │   (Editor)   │         │    Action    │                    │
│  └──────────────┘         └──────┬───────┘                    │
│                                   │                             │
│                                   v                             │
│                          ┌─────────────────┐                   │
│                          │  Redux Reducer  │                   │
│                          │ (Update State)  │                   │
│                          └────────┬────────┘                   │
│                                   │                             │
│                                   v                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Redux Middleware                          │   │
│  │  ┌──────────────────────────────────────────────┐     │   │
│  │  │  postsSyncMiddleware                         │     │   │
│  │  │                                               │     │   │
│  │  │  1. Detect action type (posts/*)             │     │   │
│  │  │  2. Start/reset debounce timer (1.5s)        │     │   │
│  │  │  3. Check workspace active                   │     │   │
│  │  │  4. Detect changes (timestamp comparison)    │     │   │
│  │  │  5. Call IPC: postsSyncToWorkspace(posts)    │     │   │
│  │  └──────────────────┬───────────────────────────┘     │   │
│  └─────────────────────┼─────────────────────────────────┘   │
│                        │                                       │
└────────────────────────┼───────────────────────────────────────┘
                         │
                         │ IPC Communication
                         │ (Electron Bridge)
                         v
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  IPC Handler: posts:sync-to-workspace               │     │
│  │                                                       │     │
│  │  1. Receive posts array from renderer                │     │
│  │  2. Get workspace path from store                    │     │
│  │  3. Serialize posts to JSON                          │     │
│  │  4. Write to {workspace}/posts/*.json                │     │
│  │  5. Return result { success, syncedCount, ... }      │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                           │
│                     v                                           │
│            ┌─────────────────┐                                 │
│            │  File System    │                                 │
│            │  posts/*.json   │                                 │
│            └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Sync Flow (Renderer → Main)

```
┌─────────────────┐
│   User Types    │
│   "Hello"       │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Component dispatches updatePostTitle()         │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Redux Reducer updates state                    │
│  post.title = "Hello"                           │
│  post.updatedAt = Date.now()                    │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Middleware intercepts action                   │
│  action.type = "posts/updatePostTitle"          │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Start debounce timer (1.5s)                    │
│  syncTimeoutId = setTimeout(sync, 1500)         │
└────────┬────────────────────────────────────────┘
         │
         │  ┌────────────────────────────────────┐
         │  │  User types " World"               │
         │  │  Timer resets                      │
         │  └───────────┬────────────────────────┘
         │              │
         │              v
         │  ┌────────────────────────────────────┐
         │  │  More updatePostTitle actions      │
         │  │  Timer keeps resetting             │
         │  └───────────┬────────────────────────┘
         │              │
         v              v
┌─────────────────────────────────────────────────┐
│  User stops typing for 1.5 seconds              │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Timer fires: syncPostsToElectron()             │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Check workspace active                         │
│  const workspace = await workspaceGetCurrent()  │
└────────┬────────────────────────────────────────┘
         │
         ├─> No workspace? Skip sync (silent)
         │
         v
┌─────────────────────────────────────────────────┐
│  Check if posts changed                         │
│  hasPostsChanged(lastSynced, current)           │
└────────┬────────────────────────────────────────┘
         │
         ├─> No changes? Skip sync
         │
         v
┌─────────────────────────────────────────────────┐
│  Call IPC: postsSyncToWorkspace(posts)          │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Electron writes to file system                 │
│  {workspace}/posts/*.json                       │
└────────┬────────────────────────────────────────┘
         │
         ├─> Success: Update lastSyncedPosts
         │
         └─> Error: Show notification to user
```

## 3. Load Flow (Main → Renderer)

```
┌─────────────────┐
│   App Mounts    │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  usePostsLoader() hook runs                     │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Check if already loaded                        │
│  if (hasLoadedRef.current) return               │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Check workspace active                         │
│  const workspace = await workspaceGetCurrent()  │
└────────┬────────────────────────────────────────┘
         │
         ├─> No workspace? Skip load
         │
         v
┌─────────────────────────────────────────────────┐
│  Call IPC: postsLoadFromWorkspace()             │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Electron reads from file system                │
│  {workspace}/posts/*.json                       │
└────────┬────────────────────────────────────────┘
         │
         ├─> File not found? Return [] (first launch)
         │
         v
┌─────────────────────────────────────────────────┐
│  Dispatch loadPosts(posts)                      │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Redux state updated                            │
│  state.posts.posts = posts                      │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  UI re-renders with posts                       │
└─────────────────────────────────────────────────┘
```

## 4. Debouncing in Action

```
Timeline (each tick = 100ms):

User Types "Hello World":

0ms:    H typed → Start timer (1500ms) ──┐
100ms:  e typed → Reset timer (1500ms) ──┼─> Timer active
200ms:  l typed → Reset timer (1500ms) ──┼─> Timer active
300ms:  l typed → Reset timer (1500ms) ──┼─> Timer active
400ms:  o typed → Reset timer (1500ms) ──┼─> Timer active
500ms:  [space] → Reset timer (1500ms) ──┼─> Timer active
600ms:  W typed → Reset timer (1500ms) ──┼─> Timer active
700ms:  o typed → Reset timer (1500ms) ──┼─> Timer active
800ms:  r typed → Reset timer (1500ms) ──┼─> Timer active
900ms:  l typed → Reset timer (1500ms) ──┼─> Timer active
1000ms: d typed → Reset timer (1500ms) ──┘
1100ms: [waiting...]
1200ms: [waiting...]
1300ms: [waiting...]
1400ms: [waiting...]
1500ms: [waiting...]
1600ms: [waiting...]
2500ms: Timer fires! → SYNC TO ELECTRON

Result: 11 keystrokes, but only 1 file write!
Efficiency: ~90% reduction in I/O operations
```

## 5. Change Detection Algorithm

```
┌─────────────────────────────────────────────────┐
│  hasPostsChanged(prevPosts, currentPosts)       │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Quick Check #1: Is prevPosts null?             │
│  if (!prevPosts) return true                    │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Quick Check #2: Length changed?                │
│  if (prev.length !== current.length)            │
│     return true                                  │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Deep Check: Loop through posts                 │
│  for (i = 0; i < posts.length; i++)             │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Compare each post:                             │
│  - prev[i].id !== current[i].id? → Changed      │
│  - prev[i].updatedAt !== current[i].updatedAt?  │
│    → Changed                                     │
└────────┬────────────────────────────────────────┘
         │
         ├─> Any change found? → return true
         │
         v
┌─────────────────────────────────────────────────┐
│  No changes detected → return false             │
└─────────────────────────────────────────────────┘

Time Complexity: O(n) where n = number of posts
Space Complexity: O(1) - no extra memory allocated
```

## 6. Error Handling Flow

```
┌─────────────────────────────────────────────────┐
│  syncPostsToElectron(posts)                     │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Try: postsSyncToWorkspace(posts)               │
└────────┬────────────────────────────────────────┘
         │
         ├─────────> Success Path
         │           │
         │           v
         │  ┌─────────────────────────────────────┐
         │  │  Update lastSyncedPosts             │
         │  │  Log success                        │
         │  └─────────────────────────────────────┘
         │
         └─────────> Error Path
                     │
                     v
            ┌─────────────────────────────────────┐
            │  Catch error                        │
            │  Log to console: [PostsSync] Failed │
            └────────┬────────────────────────────┘
                     │
                     v
            ┌─────────────────────────────────────┐
            │  Show notification to user:         │
            │  "Sync Failed - Changes may not be  │
            │   saved"                             │
            └────────┬────────────────────────────┘
                     │
                     v
            ┌─────────────────────────────────────┐
            │  User sees notification             │
            │  Can retry or check workspace       │
            └─────────────────────────────────────┘
```

## 7. Memory Management

```
┌──────────────────────────────────────────────────────────┐
│  Module-level State (Lives for app lifetime)            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  syncTimeoutId: ReturnType<typeof setTimeout> | null    │
│  Memory: 8 bytes (reference to timer)                   │
│                                                          │
│  lastSyncedPosts: Post[] | null                         │
│  Memory: 8 bytes (reference) + array data               │
│                                                          │
│  Total Overhead: ~16 bytes + (500 bytes × post count)   │
└──────────────────────────────────────────────────────────┘

Cleanup on workspace change:

┌──────────────────────────────────────────────────────────┐
│  resetPostsSyncState()                                   │
├──────────────────────────────────────────────────────────┤
│  1. lastSyncedPosts = null  → Release old posts (GC)    │
│  2. clearTimeout(syncTimeoutId) → Cancel pending sync   │
│  3. syncTimeoutId = null → Release timer reference       │
└──────────────────────────────────────────────────────────┘

No memory leaks:
✓ Timers are always cleared before new ones
✓ Old post references are released (GC can collect)
✓ No event listeners to clean up
✓ Middleware is stateless (uses module state)
```

## 8. Workspace Integration

```
┌─────────────────────────────────────────────────┐
│  Before Every Sync Operation                    │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  const workspace = await                        │
│    window.api.workspaceGetCurrent()             │
└────────┬────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────┐
│  Workspace exists?                              │
└────┬───────────────────────────────────────┬────┘
     │                                       │
     │ Yes                                   │ No
     v                                       v
┌──────────────────┐              ┌─────────────────────┐
│  Proceed with    │              │  Skip sync          │
│  sync operation  │              │  (silent - no error)│
└──────────────────┘              └─────────────────────┘

Why check every time?
- User might close workspace mid-session
- Workspace path might become invalid (e.g., external drive disconnected)
- Prevents errors and file writes to wrong locations
```

## 9. Redux Integration

```
┌────────────────────────────────────────────────────────────┐
│                    Redux Store                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐     ┌──────────────┐                   │
│  │ chatReducer  │     │ postsReducer │                   │
│  └──────────────┘     └──────┬───────┘                   │
│                              │                             │
│                              v                             │
│                     ┌─────────────────┐                   │
│                     │  Posts State    │                   │
│                     │  {              │                   │
│                     │    posts: [     │                   │
│                     │      { id, ... }│                   │
│                     │    ]            │                   │
│                     │  }              │                   │
│                     └────────┬────────┘                   │
│                              │                             │
│  ┌───────────────────────────┼─────────────────────────┐ │
│  │         Middleware Chain   │                         │ │
│  │  ┌──────────────┐  ┌──────▼─────────┐  ┌─────────┐ │ │
│  │  │   Default    │─>│  postsSyncMW   │─>│  Next   │ │ │
│  │  │  Middleware  │  └────────────────┘  │Reducer  │ │ │
│  │  └──────────────┘                      └─────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

Middleware Position:
- After default middleware (logger, thunk)
- Before reducer updates state
- Perfect spot to intercept actions and trigger side effects
```

## 10. Performance Profile

```
Operation Timeline (Typical Flow):

0ms:     User types character
         └─> Component re-render: ~1-2ms
1ms:     dispatch(updatePostTitle(...))
         └─> Action dispatch: <1ms
2ms:     Reducer updates state
         └─> State update: <1ms
3ms:     Middleware intercepts action
         └─> Action type check: <1ms
4ms:     Start/reset debounce timer
         └─> Timer operation: <1ms
5ms:     Component re-renders with new state
         └─> Re-render: ~1-2ms

Total per keystroke: ~5-7ms (imperceptible to user)

1500ms:  Debounce timer fires
         └─> Check workspace: ~1-2ms (IPC call)
1502ms:  Check posts changed
         └─> Timestamp comparison: <1ms (O(n))
1503ms:  Call postsSyncToWorkspace(posts)
         └─> IPC call + JSON.stringify: ~5-20ms (depends on post count)
1523ms:  Electron writes to file
         └─> File I/O: ~10-50ms (depends on disk speed)

Total sync time: ~20-75ms (user never notices)

Efficiency Gains:
- Without debouncing: 11 syncs × 75ms = 825ms of I/O
- With debouncing: 1 sync × 75ms = 75ms of I/O
- Savings: 750ms (91% reduction)
```

## Summary

The posts sync system is designed for:
- **Performance**: Minimal overhead per action (~5ms)
- **Efficiency**: ~90% reduction in file I/O through debouncing
- **Reliability**: Workspace validation and error handling
- **Safety**: Memory-safe with proper cleanup
- **Simplicity**: Automatic syncing with no manual intervention needed

All data flows are optimized for both user experience and system performance.
