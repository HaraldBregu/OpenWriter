# Fix: Directories Isolation Issue

## Problem Summary

**What worked**: Documents are correctly isolated between workspaces in multi-process architecture.

**What didn't work**: Directories showed the same data in both workspaces despite being separate processes.

## Root Cause

The issue was a **timing problem in workspace mode initialization**:

1. `WindowContext` is created when the workspace window opens
2. `WindowContext.initializeServices()` creates `WorkspaceMetadataService`
3. `WorkspaceMetadataService.initialize()` is called immediately
4. At this point, `workspaceService.getCurrent()` returns `null` (workspace not set yet!)
5. Service initializes with no workspace path, creates empty cache
6. THEN `workspaceService.setCurrent(workspacePath)` is called
7. The cache is never updated to reflect the actual workspace

This caused the service to either:
- Return empty directories
- Return stale cached data from previous initialization
- Read from the wrong workspace.tsrct file

## The Fix

Applied a **two-part fix**:

### Part 1: Force Cache Clear on Initialization

Modified `/src/main/services/workspace-metadata.ts`:

```typescript
initialize(): void {
  const workspacePath = this.workspaceService.getCurrent()

  // CRITICAL: Always clear cache on initialization to ensure fresh data
  console.log('[WorkspaceMetadataService] Clearing cache before initialization')
  this.cache = null

  if (workspacePath) {
    const metadata = this.readMetadataFile(workspacePath)
    console.log(
      '[WorkspaceMetadataService] Initialized with',
      metadata?.settings.directories.length ?? 0,
      'directories from',
      workspacePath
    )
  } else {
    console.log('[WorkspaceMetadataService] No workspace set, starting empty')
  }

  // Listen for workspace changes...
}
```

**Why this helps**: Ensures no stale cache data from previous initialization attempts.

### Part 2: Reinitialize After Setting Workspace Path

Modified `/src/main/index.ts` (workspace mode startup):

```typescript
// WORKSPACE MODE: Open workspace directly without launcher UI
if (isWorkspaceMode && workspacePath) {
  logger.info('App', `Opening workspace in isolated process: ${workspacePath}`)

  // Create workspace window directly - no menu, no tray
  const workspaceWindow = mainWindow.createWorkspaceWindow()

  // Set the workspace path immediately
  const context = windowContextManager.get(workspaceWindow.id)
  const workspaceService = context.getService<WorkspaceService>('workspace', container)
  workspaceService.setCurrent(workspacePath)

  // CRITICAL: Reinitialize WorkspaceMetadataService after workspace path is set
  // This ensures the service reads from the correct workspace.tsrct file
  const metadataService = context.getService<WorkspaceMetadataService>('workspaceMetadata', container)

  // Force cache clear and re-read from file
  logger.info('App', `Reinitializing WorkspaceMetadataService for workspace: ${workspacePath}`)
  metadataService.initialize()

  logger.info('App', `Workspace process ready with PID: ${process.pid}`)

  // Handle window close...
}
```

**Why this works**:
1. Service initializes the first time with no workspace (harmless)
2. Workspace path is set
3. Service is reinitialized with workspace path now available
4. Cache is cleared (from Part 1)
5. Metadata is read from correct workspace.tsrct file
6. Directories are now isolated per workspace

### Part 3: Enhanced Logging

Added detailed logging to track workspace isolation:

```typescript
// In getDirectories()
console.log(
  '[WorkspaceMetadataService] getDirectories called:',
  'PID=', process.pid,  // Shows which process
  'workspace=', workspacePath,  // Shows which workspace
  'count=', directories.length,  // Shows directory count
  'paths=', directories.map(d => d.path).join(', ')  // Shows actual paths
)

// In readMetadataFile()
console.log('[WorkspaceMetadataService] readMetadataFile:',
  'PID=', process.pid,
  'file=', filePath,
  'exists=', fs.existsSync(filePath))

console.log('[WorkspaceMetadataService] Read', parsed.settings.directories.length, 'directories from', filePath,
  'paths=', parsed.settings.directories.map(d => d.path).join(', '))

// In emitDirectoriesChanged()
console.log('[WorkspaceMetadataService] emitDirectoriesChanged:',
  'PID=', process.pid,
  'workspace=', workspacePath,
  'broadcasting', directories.length, 'directories',
  'paths=', directories.map(d => d.path).join(', '))
```

**Why this helps**: Makes it easy to diagnose isolation issues by showing:
- Which process is executing (PID)
- Which workspace it's reading from
- What directories are actually loaded
- When cache is used vs fresh reads

## Testing the Fix

### Step 1: Clean Build

```bash
# Kill any running instances
pkill -f tesseract

# Clean build
npm run clean
npm run build

# Start fresh
npm run dev
```

### Step 2: Test Workspace Isolation

1. **Launch app** (launcher process starts)

2. **Open first workspace**:
   - Select `/path/to/workspace-a`
   - Should see new process spawn (check Activity Monitor/Task Manager)
   - Note the PID in console logs

3. **Add directories in workspace A**:
   - Add `/dir1`
   - Add `/dir2`
   - Verify both appear in UI

4. **Check logs for workspace A**:
   ```
   [WorkspaceMetadataService] Clearing cache before initialization
   [WorkspaceMetadataService] Initialized with 0 directories from /path/to/workspace-a
   [App] Reinitializing WorkspaceMetadataService for workspace: /path/to/workspace-a
   [WorkspaceMetadataService] Clearing cache before initialization
   [WorkspaceMetadataService] Initialized with 2 directories from /path/to/workspace-a
   [WorkspaceMetadataService] getDirectories called: PID= 1001 workspace= /path/to/workspace-a count= 2 paths= /dir1, /dir2
   ```

5. **Keep workspace A open, return to launcher**

6. **Open second workspace**:
   - Select `/path/to/workspace-b`
   - Should see another new process spawn
   - Note the DIFFERENT PID in logs

7. **Verify workspace B is empty**:
   - Directories page should show NO directories
   - Should NOT show `/dir1` or `/dir2` from workspace A

8. **Add directory in workspace B**:
   - Add `/dir3`
   - Verify only `/dir3` appears in UI

9. **Check logs for workspace B**:
   ```
   [WorkspaceMetadataService] Clearing cache before initialization
   [WorkspaceMetadataService] Initialized with 0 directories from /path/to/workspace-b
   [App] Reinitializing WorkspaceMetadataService for workspace: /path/to/workspace-b
   [WorkspaceMetadataService] Clearing cache before initialization
   [WorkspaceMetadataService] Initialized with 1 directories from /path/to/workspace-b
   [WorkspaceMetadataService] getDirectories called: PID= 1002 workspace= /path/to/workspace-b count= 1 paths= /dir3
   ```

10. **Switch back to workspace A**:
    - Should still show only `/dir1` and `/dir2`
    - Should NOT show `/dir3` from workspace B

11. **Verify metadata files**:
    ```bash
    # Workspace A metadata
    cat /path/to/workspace-a/workspace.tsrct
    # Should show: "directories": [{ "path": "/dir1", ... }, { "path": "/dir2", ... }]

    # Workspace B metadata
    cat /path/to/workspace-b/workspace.tsrct
    # Should show: "directories": [{ "path": "/dir3", ... }]
    ```

### Expected Results

**Process Isolation**:
- 3 separate processes (1 launcher + 2 workspaces)
- Each workspace has different PID in logs
- Activity Monitor/Task Manager shows all processes

**Data Isolation**:
- Workspace A shows only [/dir1, /dir2]
- Workspace B shows only [/dir3]
- No cross-contamination

**Cache Behavior**:
- Cache is cleared on initialization (see logs)
- Cache is reinitialized after workspace path is set
- Fresh data is read from correct workspace.tsrct file

**Logs Show**:
- Correct PIDs for each workspace
- Correct workspace paths
- Correct directory counts and paths
- Cache clear messages

## Why Documents Worked But Directories Didn't

**Documents**:
- Read directly from filesystem on each request
- No persistent cache
- No initialization timing issue
- Each IPC call reads from `workspaceService.getCurrent()` which is always up-to-date

**Directories (before fix)**:
- Cached in-memory by WorkspaceMetadataService
- Cache set during initialization when workspace was `null`
- Subsequent requests returned stale cached data
- Didn't re-read from file after workspace was set

**Directories (after fix)**:
- Cache cleared on initialization
- Service reinitialized after workspace is set
- Fresh data read from correct workspace.tsrct file
- Cache now contains correct workspace data

## Files Modified

1. `/src/main/index.ts`:
   - Added import for `WorkspaceMetadataService` type
   - Added reinitialization call after setting workspace path
   - Added detailed logging

2. `/src/main/services/workspace-metadata.ts`:
   - Added cache clearing in `initialize()` method
   - Added PID to all log messages
   - Added directory paths to log messages
   - Enhanced logging in `getDirectories()`, `readMetadataFile()`, `emitDirectoriesChanged()`

## Verification Checklist

After applying the fix and rebuilding:

- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Multiple processes appear in Activity Monitor/Task Manager
- [ ] Each workspace has different PID in logs
- [ ] Workspace A directories don't appear in workspace B
- [ ] Workspace B directories don't appear in workspace A
- [ ] Both documents and directories are isolated
- [ ] Logs show correct workspace paths
- [ ] Logs show "Clearing cache before initialization"
- [ ] Logs show "Reinitializing WorkspaceMetadataService"
- [ ] Metadata files contain different data

## Future Improvements

### Option 1: Lazy Service Initialization

Instead of initializing services in WindowContext constructor, initialize them lazily on first access:

```typescript
getService<T>(key: string, globalContainer: ServiceContainer): T {
  if (!this.container.has(key)) {
    // Lazy initialization here
    this.initializeService(key, globalContainer)
  }
  return this.container.get<T>(key)
}
```

**Benefit**: Workspace path would always be set before service initialization.

### Option 2: Pass Workspace Path to WindowContext

Modify WindowContext to accept workspace path during construction:

```typescript
constructor(config: WindowContextConfig & { workspacePath?: string }) {
  // Set workspace path first
  if (config.workspacePath) {
    const workspaceService = new WorkspaceService(storeService, eventBus)
    workspaceService.setCurrent(config.workspacePath)
    this.container.register('workspace', workspaceService)
  }

  // Then initialize other services
  this.initializeServices(config.globalContainer)
}
```

**Benefit**: Cleaner initialization flow, no need for reinitialization.

### Option 3: Separate Workspace Process Bootstrap

Create a separate bootstrap function for workspace mode that registers services globally:

```typescript
export function bootstrapWorkspaceServices(workspacePath: string): BootstrapResult {
  const { container, eventBus } = bootstrapServices()

  // Register workspace services globally (no WindowContext needed)
  const workspaceService = new WorkspaceService(storeService, eventBus)
  workspaceService.setCurrent(workspacePath)
  container.register('workspace', workspaceService)

  const metadataService = new WorkspaceMetadataService(workspaceService, eventBus)
  metadataService.initialize()
  container.register('workspaceMetadata', metadataService)

  return { container, eventBus, ... }
}
```

**Benefit**: No WindowContext complexity for workspace processes, cleaner separation.

## Related Documentation

- `/docs/MULTI_PROCESS_ARCHITECTURE.md` - Multi-process architecture overview
- `/docs/TESTING_MULTI_PROCESS.md` - Testing guide for multi-process features
- `/docs/TROUBLESHOOTING_DIRECTORIES_ISOLATION.md` - Detailed troubleshooting guide
- `/docs/WINDOW_SCOPED_SERVICES.md` - Window-scoped services architecture

## Credits

This fix addresses the workspace isolation bug where directories from one workspace appeared in another workspace. The multi-process architecture provides the foundation for isolation, and this fix ensures the initialization sequence correctly leverages that isolation.
