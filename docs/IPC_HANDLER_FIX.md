# IPC Handler Fix: wrapSimpleHandler vs wrapIpcHandler

## Problem

After implementing window-scoped services, the app crashed when trying to open a workspace folder:

```
TypeError: Cannot read properties of undefined (reading 'getOwnerBrowserWindow')
    at BrowserWindow.fromWebContents
    at getWindowContext
    at getWindowService
```

The error occurred in:
- `workspace-set-current` IPC handler
- `workspace-get-current` IPC handler
- All `directories:*` IPC handlers

## Root Cause

The issue was a **misuse of `wrapSimpleHandler`** in the IPC handler implementations.

### Understanding the Two Wrapper Functions

#### `wrapSimpleHandler` - For handlers WITHOUT event parameter

```typescript
// IpcErrorHandler.ts
export function wrapSimpleHandler<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult> | TResult,
  handlerName: string
): (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<IpcResult<TResult>> {
  return wrapIpcHandler((_event, ...args) => handler(...args), handlerName)
  //                      ^^^^^^ - Event is DISCARDED!
}
```

**Key point:** `wrapSimpleHandler` **discards the event parameter**! It's designed for handlers that don't need access to the IPC event.

#### `wrapIpcHandler` - For handlers WITH event parameter

```typescript
// IpcErrorHandler.ts
export function wrapIpcHandler<TArgs extends unknown[], TResult>(
  handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult,
  handlerName: string
): (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<IpcResult<TResult>> {
  return async (event: IpcMainInvokeEvent, ...args: TArgs): Promise<IpcResult<TResult>> => {
    try {
      const result = await handler(event, ...args)
      //                            ^^^^^ - Event is PASSED through
      return { success: true, data: result }
    } catch (err) {
      // ... error handling
    }
  }
}
```

**Key point:** `wrapIpcHandler` **passes the event parameter through** to the handler.

### What Went Wrong

```typescript
// WRONG - Using wrapSimpleHandler with event parameter
ipcMain.handle(
  'workspace-set-current',
  wrapSimpleHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
    //                ^^^^^ - This is NOT the IPC event!
    // wrapSimpleHandler discards the real event,
    // so 'event' here is actually 'workspacePath'!
    const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
    //                                                    ^^^^^ - undefined!
    workspace.setCurrent(workspacePath)
  }, 'workspace-set-current')
)
```

What actually happened:
1. Electron calls the handler: `handler(ipcEvent, '/path/to/workspace')`
2. `wrapSimpleHandler` discards `ipcEvent`: `handler('/path/to/workspace')`
3. Handler receives: `event = '/path/to/workspace'`, `workspacePath = undefined`
4. `getWindowService(event, ...)` tries to use a string as an IPC event
5. `BrowserWindow.fromWebContents(event.sender)` crashes because `event.sender` is undefined

## Solution

Use `wrapIpcHandler` for all window-scoped handlers that need the event parameter:

```typescript
// CORRECT - Using wrapIpcHandler with event parameter
ipcMain.handle(
  'workspace-set-current',
  wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
    //            ^^^^^ - Now this IS the IPC event
    const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
    workspace.setCurrent(workspacePath)
  }, 'workspace-set-current')
)
```

## Files Fixed

### 1. `/src/main/ipc/WorkspaceIpc.ts`

**Changed:**
```typescript
import { wrapSimpleHandler } from './IpcErrorHandler'

// Changed to:
import { wrapIpcHandler } from './IpcErrorHandler'
```

**Updated all window-scoped handlers:**
```typescript
// Before:
wrapSimpleHandler((event: IpcMainInvokeEvent) => { ... })

// After:
wrapIpcHandler((event: IpcMainInvokeEvent) => { ... })
```

**Kept `wrapSimpleHandler` for:**
```typescript
// workspace:select-folder - doesn't need event, just shows dialog
ipcMain.handle(
  'workspace:select-folder',
  wrapSimpleHandler(async () => {
    const result = await dialog.showOpenDialog({ ... })
    return result.filePaths[0]
  }, 'workspace:select-folder')
)
```

### 2. `/src/main/ipc/DirectoriesIpc.ts`

Same changes:
- Import `wrapIpcHandler` instead of `wrapSimpleHandler`
- Updated all 6 handlers to use `wrapIpcHandler`

### 3. `/src/main/ipc/IpcHelpers.ts`

Added comprehensive error handling:

```typescript
export function getWindowContext(event: IpcMainInvokeEvent, container: ServiceContainer) {
  // Validate event and sender
  if (!event) {
    throw new Error('[IpcHelpers] IPC event is null or undefined')
  }

  if (!event.sender) {
    throw new Error('[IpcHelpers] IPC event.sender is null or undefined')
  }

  // Get BrowserWindow from WebContents
  const window = BrowserWindow.fromWebContents(event.sender)

  if (!window) {
    throw new Error(
      `[IpcHelpers] Cannot get BrowserWindow from WebContents (sender ID: ${event.sender.id}). ` +
      'Window may have been destroyed or WebContents is detached.'
    )
  }

  // Get WindowContext for this window
  try {
    return windowContextManager.get(window.id)
  } catch (error) {
    throw new Error(
      `[IpcHelpers] No WindowContext found for window ID ${window.id}. ` +
      'Window context may not have been created. ' +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
```

## When to Use Which Wrapper

### Use `wrapSimpleHandler` when:
- Handler does NOT need the IPC event
- Handler only needs the arguments from renderer
- Example: Dialog functions, pure calculations, global queries

```typescript
ipcMain.handle('show-dialog',
  wrapSimpleHandler(async (message: string) => {
    return await dialog.showMessageBox({ message })
  }, 'show-dialog')
)
```

### Use `wrapIpcHandler` when:
- Handler needs the IPC event to access window context
- Handler needs to get window-scoped services
- Handler needs window ID, sender information, etc.

```typescript
ipcMain.handle('get-workspace',
  wrapIpcHandler((event: IpcMainInvokeEvent) => {
    const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
    return workspace.getCurrent()
  }, 'get-workspace')
)
```

## Decision Tree

```
Does your handler need to access window-scoped services?
├─ YES → Use wrapIpcHandler
│   └─ Include 'event: IpcMainInvokeEvent' as first parameter
│
└─ NO → Use wrapSimpleHandler
    └─ Only include your business logic parameters
```

## Testing

TypeScript compilation: ✅ No errors

To verify the fix works:
1. Start the app
2. Try to select a workspace folder
3. Should succeed without crashing
4. Verify workspace is set correctly
5. Try opening Directories page
6. Should load directories without errors

## Lessons Learned

1. **Read the wrapper implementation** - Understanding what `wrapSimpleHandler` does internally (discarding the event) would have prevented this bug

2. **TypeScript doesn't catch this** - Because both wrappers return the same type, TypeScript thinks both are valid. The bug only shows up at runtime.

3. **Name confusion** - `wrapSimpleHandler` sounds like it should work for "simple" cases, but it's specifically for handlers that don't use the event parameter

4. **Better naming would help**:
   - `wrapHandlerWithoutEvent` instead of `wrapSimpleHandler`
   - `wrapHandlerWithEvent` instead of `wrapIpcHandler`

## Related Documentation

- [WINDOW_SCOPED_SERVICES.md](./WINDOW_SCOPED_SERVICES.md) - Window-scoped services architecture
- [WORKSPACE_ISOLATION_DEBUG.md](./WORKSPACE_ISOLATION_DEBUG.md) - Debugging workspace isolation
