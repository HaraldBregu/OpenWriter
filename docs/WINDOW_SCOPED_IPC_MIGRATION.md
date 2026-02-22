# Window-Scoped IPC Migration Guide

## Problem

After implementing window-scoped services, several IPC modules failed to register because they were trying to get workspace-related services from the global container during the `register()` phase:

```
[Bootstrap] Failed to register IPC module: posts Error: Service "workspace" not found. Was it registered?
[Bootstrap] Failed to register IPC module: documents Error: Service "workspace" not found. Was it registered?
```

## Root Cause

The affected IPC modules (PostsIpc, DocumentsIpc) were using an anti-pattern:

```typescript
// ANTI-PATTERN: Getting services during registration
register(container: ServiceContainer): void {
  // ❌ WRONG: Tries to get window-scoped service from global container
  const workspace = container.get<WorkspaceService>('workspace')
  const fileWatcher = container.get<FileWatcherService>('fileWatcher')

  ipcMain.handle('posts:sync', wrapSimpleHandler(async (posts: Post[]) => {
    const currentWorkspace = workspace.getCurrent()  // Uses captured service
    // ...
  }))
}
```

**Problems:**
1. `workspace` and `fileWatcher` are now window-scoped, not in global container
2. Even if they were global, this creates a closure over a single instance
3. Can't access different workspaces for different windows

## Solution

Get window-scoped services **per-request** inside each IPC handler using `getWindowService()`:

```typescript
// CORRECT PATTERN: Getting services per-request
register(container: ServiceContainer): void {
  ipcMain.handle('posts:sync',
    wrapIpcHandler(async (event: IpcMainInvokeEvent, posts: Post[]) => {
      // ✅ CORRECT: Get window-scoped service for THIS request
      const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
      const fileWatcher = tryGetWindowService<FileWatcherService>(event, container, 'fileWatcher')

      const currentWorkspace = workspace.getCurrent()
      // ...
    })
  )
}
```

## Migration Steps

### 1. Update Imports

```typescript
// Before:
import { wrapSimpleHandler } from './IpcErrorHandler'

// After:
import type { IpcMainInvokeEvent } from 'electron'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
```

### 2. Remove Service Extraction from `register()`

```typescript
// Before:
register(container: ServiceContainer): void {
  const workspace = container.get<WorkspaceService>('workspace')  // ❌ Remove this
  const fileWatcher = container.get<FileWatcherService>('fileWatcher')  // ❌ Remove this

  // ... handlers
}

// After:
register(container: ServiceContainer): void {
  // No service extraction here

  // ... handlers
}
```

### 3. Update Each Handler

#### Change wrapper from `wrapSimpleHandler` to `wrapIpcHandler`:

```typescript
// Before:
wrapSimpleHandler(async (posts: Post[]) => {
  const currentWorkspace = workspace.getCurrent()  // ❌ Stale reference
  // ...
})

// After:
wrapIpcHandler(async (event: IpcMainInvokeEvent, posts: Post[]) => {
  const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
  const currentWorkspace = workspace.getCurrent()  // ✅ Fresh, window-scoped
  // ...
})
```

### 4. Add Helper for Optional Services

If your IPC module uses optional services (like FileWatcherService), add this helper:

```typescript
export class MyIpc implements IpcModule {
  // ... existing code

  /**
   * Try to get a window-scoped service, returning null if not found.
   */
  private tryGetWindowService<T>(
    event: IpcMainInvokeEvent,
    container: ServiceContainer,
    serviceKey: string
  ): T | null {
    try {
      return getWindowService<T>(event, container, serviceKey)
    } catch {
      return null
    }
  }
}
```

Then use it:

```typescript
const fileWatcher = this.tryGetWindowService<FileWatcherService>(event, container, 'fileWatcher')

if (fileWatcher) {
  fileWatcher.markFileAsWritten(filePath)
}
```

## Files Fixed

### 1. PostsIpc.ts

**Changes:**
- ✅ Removed `workspace` and `fileWatcher` from `register()`
- ✅ Updated all 4 handlers to use `wrapIpcHandler`
- ✅ Each handler now calls `getWindowService()` to get workspace
- ✅ Added `tryGetWindowService()` helper for optional FileWatcherService

**Handlers updated:**
- `posts:sync-to-workspace`
- `posts:update-post`
- `posts:delete-post`
- `posts:load-from-workspace`

### 2. DocumentsIpc.ts

**Changes:**
- ✅ Removed `workspace` and `documentsWatcher` from `register()`
- ✅ Updated all 5 handlers to use `wrapIpcHandler`
- ✅ Each handler now calls `getWindowService()` to get workspace
- ✅ Added `tryGetWindowService()` helper for optional DocumentsWatcherService

**Handlers updated:**
- `documents:import-files`
- `documents:import-by-paths`
- `documents:download-from-url`
- `documents:load-all`
- `documents:delete-file`

## Before & After Example

### Before (Broken)

```typescript
export class PostsIpc implements IpcModule {
  register(container: ServiceContainer): void {
    // ❌ Get service once during registration
    const workspace = container.get<WorkspaceService>('workspace')

    ipcMain.handle('posts:sync',
      wrapSimpleHandler(async (posts: Post[]) => {
        // ❌ Uses stale workspace reference
        // ❌ Same workspace for all windows!
        const currentWorkspace = workspace.getCurrent()
        const postsDir = path.join(currentWorkspace, 'posts')
        // ... write files
      })
    )
  }
}
```

**Issues:**
- Service "workspace" not found (it's window-scoped now)
- Even if found, all windows would share the same workspace instance

### After (Fixed)

```typescript
export class PostsIpc implements IpcModule {
  register(container: ServiceContainer): void {
    ipcMain.handle('posts:sync',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, posts: Post[]) => {
        // ✅ Get workspace for THIS window
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')

        // ✅ Each window gets its own workspace
        const currentWorkspace = workspace.getCurrent()
        const postsDir = path.join(currentWorkspace, 'posts')
        // ... write files
      })
    )
  }

  private tryGetWindowService<T>(
    event: IpcMainInvokeEvent,
    container: ServiceContainer,
    serviceKey: string
  ): T | null {
    try {
      return getWindowService<T>(event, container, serviceKey)
    } catch {
      return null
    }
  }
}
```

**Benefits:**
- ✅ Works with window-scoped services
- ✅ Each window accesses its own workspace
- ✅ Complete workspace isolation

## Testing

TypeScript compilation: ✅ No errors

To verify the fix works:
1. Start the app
2. Open a workspace
3. Perform post operations (create, update, delete)
4. Perform document operations (import, delete)
5. Verify files are saved to correct workspace directory
6. Open a second workspace window
7. Verify each window operates on its own workspace

## Common Pitfalls

### Pitfall 1: Forgetting to change wrapper

```typescript
// ❌ WRONG: Still using wrapSimpleHandler with event parameter
wrapSimpleHandler((event: IpcMainInvokeEvent, arg: string) => { ... })

// ✅ CORRECT: Use wrapIpcHandler
wrapIpcHandler((event: IpcMainInvokeEvent, arg: string) => { ... })
```

### Pitfall 2: Not extracting workspace per-request

```typescript
// ❌ WRONG: Trying to get workspace once at module level
const workspace = container.get<WorkspaceService>('workspace')

// ✅ CORRECT: Get workspace in each handler
wrapIpcHandler((event: IpcMainInvokeEvent) => {
  const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
})
```

### Pitfall 3: Not handling optional services

```typescript
// ❌ WRONG: Will throw if service doesn't exist
const watcher = getWindowService<FileWatcherService>(event, container, 'fileWatcher')

// ✅ CORRECT: Use tryGetWindowService for optional services
const watcher = this.tryGetWindowService<FileWatcherService>(event, container, 'fileWatcher')
if (watcher) {
  watcher.doSomething()
}
```

## Decision Tree

When should you get services during registration vs per-request?

```
Is the service window-scoped?
├─ YES (workspace, workspaceMetadata, fileWatcher, documentsWatcher)
│   └─ Get per-request using getWindowService(event, container, key)
│
└─ NO (global services: logger, store, dialog, etc.)
    └─ Can get during registration: container.get(key)
          (but getting per-request is also fine and more consistent)
```

## Related Documentation

- [WINDOW_SCOPED_SERVICES.md](./WINDOW_SCOPED_SERVICES.md) - Window-scoped services architecture
- [IPC_HANDLER_FIX.md](./IPC_HANDLER_FIX.md) - wrapSimpleHandler vs wrapIpcHandler
- [WORKSPACE_ISOLATION_DEBUG.md](./WORKSPACE_ISOLATION_DEBUG.md) - Debugging workspace isolation
