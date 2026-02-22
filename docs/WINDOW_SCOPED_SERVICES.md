# Window-Scoped Services Architecture

## Problem: Workspace Isolation Failure

### The Root Cause

The original architecture had a critical flaw: **all BrowserWindows shared the same global service instances**.

When multiple workspace windows were open:
1. Window A opens Workspace A → calls `workspaceService.setCurrent('/path/to/workspace-a')`
2. Window B opens Workspace B → calls `workspaceService.setCurrent('/path/to/workspace-b')`
3. **Both windows now think they're in Workspace B!**

This caused:
- Directories from Workspace B appearing in Workspace A
- Changes in one window affecting other windows
- Complete breakdown of workspace isolation

### Why It Happened

```typescript
// OLD ARCHITECTURE (BROKEN):
// bootstrap.ts - Services created ONCE globally
const workspaceService = new WorkspaceService(storeService, eventBus)
container.register('workspace', workspaceService)  // SINGLETON

// main.ts - All windows use the SAME instance
const mainWindow = windowFactory.create(...)      // Window 1
const workspaceWindow = windowFactory.create(...) // Window 2
// Both windows → same IPC handlers → same workspaceService instance
```

## Solution: Window-Scoped Services

### Architecture Overview

Each BrowserWindow now gets its own isolated `WindowContext` containing window-specific service instances:

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Services                          │
│  (Shared across all windows)                                │
│  - Logger, Store, MediaPermissions, Network, etc.           │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Window 1 │      │ Window 2 │      │ Window 3 │
   │  (WS A)  │      │  (WS B)  │      │  (WS C)  │
   └──────────┘      └──────────┘      └──────────┘
        │                 │                 │
        ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Context1 │      │ Context2 │      │ Context3 │
   ├──────────┤      ├──────────┤      ├──────────┤
   │ • WS Svc │      │ • WS Svc │      │ • WS Svc │
   │ • WS Meta│      │ • WS Meta│      │ • WS Meta│
   │ • Watcher│      │ • Watcher│      │ • Watcher│
   └──────────┘      └──────────┘      └──────────┘
        │                 │                 │
        ▼                 ▼                 ▼
  workspace_a/      workspace_b/      workspace_c/
  workspace.tsrct   workspace.tsrct   workspace.tsrct
```

### Key Components

#### 1. WindowContext (`/src/main/core/WindowContext.ts`)

Encapsulates all per-window state and services:

```typescript
export class WindowContext {
  public readonly windowId: number
  public readonly window: BrowserWindow
  public readonly container: ServiceContainer  // Window-specific services
  public readonly eventBus: EventBus

  constructor(config: WindowContextConfig) {
    this.window = config.window
    this.windowId = config.window.id
    this.container = new ServiceContainer()  // NEW container per window

    // Initialize window-scoped services
    this.initializeServices(config.globalContainer)
  }

  private initializeServices(globalContainer: ServiceContainer): void {
    const storeService = globalContainer.get<StoreService>('store')

    // Each window gets its OWN instances
    const workspaceService = new WorkspaceService(storeService, this.eventBus)
    this.container.register('workspace', workspaceService)

    const workspaceMetadataService = new WorkspaceMetadataService(workspaceService, this.eventBus)
    this.container.register('workspaceMetadata', workspaceMetadataService)

    // ... other window-scoped services
  }
}
```

#### 2. WindowContextManager (`/src/main/core/WindowContext.ts`)

Manages all window contexts and provides centralized lookup:

```typescript
export class WindowContextManager {
  private contexts = new Map<number, WindowContext>()

  create(window: BrowserWindow): WindowContext {
    const context = new WindowContext({
      window,
      globalContainer: this.globalContainer,
      eventBus: this.eventBus
    })

    this.contexts.set(window.id, context)
    return context
  }

  get(windowId: number): WindowContext {
    const context = this.contexts.get(windowId)
    if (!context) {
      throw new Error(`No window context found for window ID ${windowId}`)
    }
    return context
  }
}
```

#### 3. IPC Helper Functions (`/src/main/ipc/IpcHelpers.ts`)

Utilities to access window-scoped services from IPC handlers:

```typescript
export function getWindowService<T>(
  event: IpcMainInvokeEvent,
  container: ServiceContainer,
  serviceKey: string
): T {
  const windowContextManager = container.get<WindowContextManager>('windowContextManager')
  const window = BrowserWindow.fromWebContents(event.sender)

  if (!window) {
    throw new Error('Cannot get window from IPC event sender')
  }

  const context = windowContextManager.get(window.id)
  return context.getService<T>(serviceKey, container)
}
```

### Implementation Details

#### Window Creation (Main.ts)

```typescript
export class Main {
  constructor(
    private appState: AppState,
    private windowFactory: WindowFactory,
    private windowContextManager: WindowContextManager  // NEW
  ) {}

  create(): BrowserWindow {
    const window = this.windowFactory.create({ /* ... */ })

    // Create window context for isolated services
    this.windowContextManager.create(window)
    console.log(`[Main] Created window context for window ${window.id}`)

    return window
  }

  createWorkspaceWindow(): BrowserWindow {
    const workspaceWindow = this.windowFactory.create({ /* ... */ })

    // CRITICAL: Each workspace window gets its own service instances
    this.windowContextManager.create(workspaceWindow)

    return workspaceWindow
  }
}
```

#### IPC Handlers (WorkspaceIpc.ts, DirectoriesIpc.ts)

```typescript
// OLD (BROKEN):
register(container: ServiceContainer, _eventBus: EventBus): void {
  const workspace = container.get<WorkspaceService>('workspace')  // GLOBAL

  ipcMain.handle('workspace-get-current',
    wrapSimpleHandler(() => workspace.getCurrent(), '...'))
}

// NEW (FIXED):
register(container: ServiceContainer, _eventBus: EventBus): void {
  ipcMain.handle('workspace-get-current',
    wrapSimpleHandler((event: IpcMainInvokeEvent) => {
      // Get the service from THIS window's context
      const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
      return workspace.getCurrent()
    }, '...'))
}
```

#### Bootstrap Changes (bootstrap.ts)

```typescript
// OLD: Services registered globally
const workspaceService = new WorkspaceService(storeService, eventBus)
container.register('workspace', workspaceService)

// NEW: WindowContextManager creates services per window
const windowContextManager = new WindowContextManager(container, eventBus)
container.register('windowContextManager', windowContextManager)
```

### Service Categories

#### Global Services (Shared)
- Logger
- Store
- MediaPermissions
- Bluetooth
- Network
- Cron
- WindowManager
- Filesystem
- Dialog
- Notification
- Clipboard
- Agent
- RAG
- Pipeline

#### Window-Scoped Services (Isolated)
- **WorkspaceService** - Current workspace path for THIS window
- **WorkspaceMetadataService** - Metadata (.tsrct) for THIS workspace
- **FileWatcherService** - Watches THIS workspace's files
- **DocumentsWatcherService** - Watches THIS workspace's documents

## Testing

### Verify Workspace Isolation

1. **Open two workspace windows:**
   ```
   Window 1: Select /path/to/workspace-a
   Window 2: Select /path/to/workspace-b
   ```

2. **Add directories in Window 1:**
   - Navigate to Directories page in Window 1
   - Add some directories
   - Verify they're saved to `workspace-a/workspace.tsrct`

3. **Check Window 2:**
   - Navigate to Directories page in Window 2
   - Should see NO directories (or only Window 2's own directories)
   - Verify Window 2 reads from `workspace-b/workspace.tsrct`

4. **Verify complete isolation:**
   ```bash
   # Window 1's workspace
   cat /path/to/workspace-a/workspace.tsrct

   # Window 2's workspace
   cat /path/to/workspace-b/workspace.tsrct

   # Should contain DIFFERENT data
   ```

### Debug Logging

The WindowContext system includes comprehensive logging:

```
[WindowContext] Creating context for window 1
[WindowContext] Initialized all services for window 1
[Main] Created window context for window 1

[WindowContext] Creating context for window 2
[WindowContext] Initialized all services for window 2
[Main] Created window context for workspace window 2

[WindowContext] Destroying context for window 1
```

## Migration Guide

### For New Services

If you create a new service that should be window-scoped:

1. **Add to WindowContext.ts:**
   ```typescript
   private initializeServices(globalContainer: ServiceContainer): void {
     // ... existing services

     const myService = new MyService(dependencies)
     this.container.register('myService', myService)
   }
   ```

2. **Update IPC handlers:**
   ```typescript
   ipcMain.handle('my-service:action',
     wrapSimpleHandler((event: IpcMainInvokeEvent) => {
       const myService = getWindowService<MyService>(event, container, 'myService')
       return myService.doSomething()
     }, '...'))
   ```

### For Existing Services

To convert a global service to window-scoped:

1. Remove from `bootstrap.ts`
2. Add to `WindowContext.initializeServices()`
3. Update all IPC handlers to use `getWindowService()`
4. Verify no other code references the global instance

## Benefits

✅ **Complete Workspace Isolation** - Each window has its own workspace state
✅ **No Data Leakage** - Changes in one window don't affect others
✅ **Cleaner Architecture** - Clear separation of global vs window-scoped concerns
✅ **Easy Testing** - Can test window isolation by opening multiple windows
✅ **Scalable** - Can open unlimited workspace windows without conflicts
✅ **Type-Safe** - TypeScript ensures correct service access patterns

## Potential Future Improvements

1. **Service Factory Pattern** - Abstract service creation for easier testing
2. **Dependency Injection** - More sophisticated DI container with auto-wiring
3. **Context Inheritance** - Child windows inherit parent context
4. **Context Serialization** - Save/restore window contexts across app restarts
5. **Context Events** - Notify when services are created/destroyed in contexts

## Related Documentation

- [WORKSPACE_METADATA_FIX.md](./WORKSPACE_METADATA_FIX.md) - Previous attempt at fixing isolation via caching
- [WORKSPACE_ISOLATION_DEBUG.md](./WORKSPACE_ISOLATION_DEBUG.md) - Debugging guide
- Architecture diagrams in `/docs/architecture/`
