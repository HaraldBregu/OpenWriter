# Multi-Process Workspace Architecture

## Overview

Tesseract AI uses a multi-process architecture where each workspace runs in a completely isolated Electron process. This ensures absolute isolation between workspaces - no shared memory, no shared services, no data leakage.

## Architecture

### Two Process Types

1. **Launcher Process**
   - The initial process that starts when you launch the application
   - Shows workspace selector UI
   - Manages system tray and application menu
   - Enforces single instance lock (only one launcher allowed)
   - Spawns child workspace processes

2. **Workspace Process**
   - Spawned when user selects a workspace
   - Completely isolated from launcher and other workspaces
   - Own main process, own memory space, own service instances
   - Runs detached from parent (can outlive launcher)
   - No single instance lock (multiple workspaces allowed)

### Process Flow

```
User launches app
    ↓
Launcher Process starts
    ↓
User selects workspace from UI
    ↓
Launcher spawns Workspace Process
    ↓
Workspace Process opens with selected folder
    ↓
User closes Workspace window
    ↓
Workspace Process terminates
    ↓
Launcher Process remains running
```

## Implementation Details

### Process Detection

The `WorkspaceProcessManager` provides methods to detect process type:

```typescript
// Check if running in workspace mode
WorkspaceProcessManager.isWorkspaceMode() // true if --workspace flag present

// Check if running in launcher mode
WorkspaceProcessManager.isLauncherMode() // true if no --workspace flag

// Get workspace path from command line
WorkspaceProcessManager.getWorkspacePathFromArgs() // returns path or null
```

### Process Spawning

When a workspace is selected via the UI:

```typescript
const workspaceProcessManager = new WorkspaceProcessManager(logger)

const pid = workspaceProcessManager.spawnWorkspaceProcess({
  workspacePath: '/path/to/workspace',
  logger
})

console.log(`Spawned workspace process with PID: ${pid}`)
```

The spawned process receives:

**Command line arguments:**
```bash
/path/to/electron /path/to/app --workspace /path/to/workspace --process-type=workspace
```

**Environment variables:**
```bash
ELECTRON_WORKSPACE_MODE=true
ELECTRON_WORKSPACE_PATH=/path/to/workspace
```

### Lifecycle Differences

#### Launcher Process

```typescript
// src/main/services/lifecycle.ts
constructor(callbacks?: LifecycleCallbacks) {
  if (WorkspaceProcessManager.isLauncherMode()) {
    // Enforce single instance
    this.isSingleInstance = app.requestSingleInstanceLock()

    if (!this.isSingleInstance) {
      app.quit()
      return
    }

    // Handle second instance attempts
    app.on('second-instance', (event, argv) => {
      // Focus existing launcher window
    })
  }
}
```

#### Workspace Process

```typescript
constructor(callbacks?: LifecycleCallbacks) {
  if (WorkspaceProcessManager.isWorkspaceMode()) {
    // Allow multiple instances
    this.isSingleInstance = false
    this.pushEvent('workspace-mode', 'Running as workspace process')
  }
}
```

### Startup Behavior

#### Launcher Mode

```typescript
// src/main/index.ts
app.whenReady().then(() => {
  if (WorkspaceProcessManager.isLauncherMode()) {
    // Normal startup
    menuManager.create()
    trayManager.create()
    mainWindow.create()  // Shows workspace selector
  }
})
```

#### Workspace Mode

```typescript
app.whenReady().then(() => {
  if (WorkspaceProcessManager.isWorkspaceMode() && workspacePath) {
    // Open workspace directly - no menu, no tray
    const workspaceWindow = mainWindow.createWorkspaceWindow()

    // Set workspace path immediately
    const workspaceService = getWorkspaceService(workspaceWindow)
    workspaceService.setCurrent(workspacePath)

    // Quit when workspace window closes
    workspaceWindow.on('closed', () => {
      app.quit()
    })
  }
})
```

## Benefits

### Complete Isolation

- **Memory**: Each workspace has its own heap, no shared objects
- **Services**: Separate WorkspaceService, WorkspaceMetadataService, FileWatcherService instances
- **File Handles**: No risk of file lock conflicts between workspaces
- **Process Resources**: CPU, disk I/O are tracked separately per workspace

### Crash Isolation

- If one workspace process crashes, others remain unaffected
- Launcher process remains stable even if workspace crashes
- User can continue working in other workspaces

### Security

- Process sandboxing applies per workspace
- Context isolation enforced at process boundary
- No IPC between workspace processes (only launcher ↔ workspace)

### Resource Management

- Each workspace can be profiled independently
- Memory leaks are contained to single workspace
- Easy to identify resource-heavy workspaces

## Window-Scoped Services vs Process Isolation

Previously, we implemented **window-scoped services** which provided isolation at the window level within a single main process. This was a good step but had limitations:

### Window-Scoped (Previous)
```
Main Process
├─ Global Container
│  ├─ Logger (shared)
│  └─ EventBus (shared)
│
├─ Window 1 Context
│  ├─ WorkspaceService (isolated)
│  └─ WorkspaceMetadataService (isolated)
│
└─ Window 2 Context
   ├─ WorkspaceService (isolated)
   └─ WorkspaceMetadataService (isolated)
```

**Limitations:**
- Shared event bus could leak events
- Shared memory space (GC pauses affect all windows)
- Single point of failure (main process crash kills all windows)
- File system watches might interfere

### Multi-Process (Current)
```
Launcher Process
├─ Global Container
│  ├─ Logger
│  └─ EventBus
└─ (spawns workspace processes)

Workspace Process 1
├─ Global Container
│  ├─ Logger
│  ├─ EventBus
│  ├─ WorkspaceService
│  └─ WorkspaceMetadataService
└─ Window

Workspace Process 2
├─ Global Container
│  ├─ Logger
│  ├─ EventBus
│  ├─ WorkspaceService
│  └─ WorkspaceMetadataService
└─ Window
```

**Benefits:**
- True isolation at OS level
- No shared memory whatsoever
- Independent crash recovery
- Cleaner architecture (no window context complexity for workspaces)

## File Structure

```
src/main/
├─ workspace-process.ts           # WorkspaceProcessManager class
├─ services/
│  └─ lifecycle.ts                 # Conditional single-instance lock
├─ ipc/
│  └─ WorkspaceIpc.ts              # Spawns workspace processes
└─ index.ts                        # Detects process type, routes startup
```

## Testing

### Manual Testing

1. Launch app (launcher process starts)
2. Select workspace A → new process spawns
3. Return to launcher, select workspace B → another new process spawns
4. Verify both workspaces run independently
5. Close workspace A → only that process terminates
6. Launcher and workspace B continue running

### Process Verification

```bash
# List all Tesseract AI processes
ps aux | grep tesseract-ai

# Should see:
# - 1 launcher process
# - 1 process per open workspace
```

### Memory Verification

Use Activity Monitor (macOS) or Task Manager (Windows) to verify:
- Each workspace shows as separate process
- Memory usage is independent per process
- Killing one process doesn't affect others

## Migration Notes

If you have existing code that assumes single main process:

### Before (Single Process)
```typescript
// Accessing global workspace service
const workspace = container.get<WorkspaceService>('workspace')
workspace.setCurrent(path)
```

### After (Multi-Process)
```typescript
// In launcher process - spawn new process
const workspaceProcessManager = new WorkspaceProcessManager(logger)
workspaceProcessManager.spawnWorkspaceProcess({ workspacePath: path })

// In workspace process - service is automatically initialized
// No manual service access needed, workspace loads automatically
```

## Troubleshooting

### "Another instance already running" error

**Symptom**: Can't open second workspace

**Cause**: Workspace process incorrectly applying single instance lock

**Fix**: Ensure `WorkspaceProcessManager.isLauncherMode()` check in LifecycleService constructor

### Workspace window doesn't open workspace

**Symptom**: Workspace process opens but shows empty window

**Cause**: Workspace path not passed correctly

**Fix**: Verify `--workspace` argument in spawn args and `ELECTRON_WORKSPACE_PATH` env var

### Process doesn't terminate when window closes

**Symptom**: Workspace process stays alive after closing window

**Cause**: Missing `app.quit()` in window closed handler

**Fix**: Ensure workspace mode startup code includes:
```typescript
workspaceWindow.on('closed', () => {
  app.quit()
})
```

## Performance Considerations

### Memory Usage

- Each process has ~40-60MB base overhead
- Total memory = (launcher memory) + (workspace memory × num workspaces)
- For 3 workspaces: ~60MB + (100MB × 3) = ~360MB typical

### Startup Time

- Launcher startup: ~500ms
- Workspace process spawn: ~300ms
- Total time to workspace: ~800ms

### Process Communication

- No IPC between workspaces (by design)
- Launcher ↔ workspace communication not currently implemented
- Could add in future if needed (e.g., "open workspace B from workspace A")

## Future Enhancements

### Process Monitoring

Could add launcher features like:
- List all running workspace processes
- Monitor workspace process health
- Restart crashed workspace processes
- Resource usage dashboard

### Inter-Workspace Communication

Currently workspaces are completely isolated. Could add:
- Message passing between workspaces
- Shared clipboard/copy-paste between workspaces
- "Open in new workspace" command

### Process Pooling

For performance optimization:
- Pre-spawn "warm" workspace processes
- Reuse terminated processes for new workspaces
- Process affinity for frequently used workspaces

## References

- Node.js `child_process.spawn()`: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
- Electron multi-process architecture: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron `app.requestSingleInstanceLock()`: https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelock
