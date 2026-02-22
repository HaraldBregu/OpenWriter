# Troubleshooting: Directories Isolation Issue

## Problem Report

**Documents work correctly** - they are isolated between workspaces.
**Directories show the same data** - both workspaces show the same directories despite being separate processes.

## Root Cause Analysis

Since documents work but directories don't, this reveals the issue is NOT with the multi-process architecture itself (which is working), but with how directory data is loaded and cached.

### Key Differences

**Documents**:
- Read directly from filesystem (`/workspace/documents/` folder)
- Each process reads its own workspace folder
- No persistent cache

**Directories**:
- Read from metadata file (`/workspace/workspace.tsrct`)
- Uses in-memory cache in `WorkspaceMetadataService`
- Cache might not be cleared when workspace changes

## Diagnostic Steps

### Step 1: Verify Multi-Process Architecture is Working

1. **Rebuild the application**:
   ```bash
   npm run build
   ```

2. **Start the application**:
   ```bash
   npm run dev
   ```

3. **Open Activity Monitor** (macOS) or **Task Manager** (Windows)

4. **Select workspace A** from the launcher

5. **Check process list**:
   - You should see 2 processes (1 launcher + 1 workspace)
   - Note the PID of the workspace process

6. **Return to launcher** and **select workspace B**

7. **Check process list again**:
   - You should see 3 processes (1 launcher + 2 workspaces)
   - Each workspace should have a different PID

**If you see only 2 processes total**, the multi-process spawning is not working. This means:
- You might be testing with old code (rebuild needed)
- The workspace selection is creating windows instead of processes

**If you see 3 processes**, the architecture is working correctly. Continue to Step 2.

### Step 2: Check Workspace Paths

1. **Open DevTools** in workspace A: `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows)

2. **In the console**, check:
   ```javascript
   // In main process (if DevTools shows main process console)
   console.log('Workspace path:', workspaceService.getCurrent())
   console.log('Process PID:', process.pid)
   ```

3. **Repeat for workspace B**

4. **Verify**:
   - Each workspace should show a different path
   - Each workspace should show a different PID

**If both show the same path**, the workspace is not being set correctly in workspace mode.

### Step 3: Check Metadata Files

1. **Open terminal**

2. **Check workspace A metadata**:
   ```bash
   cat /path/to/workspace-a/workspace.tsrct
   ```

3. **Check workspace B metadata**:
   ```bash
   cat /path/to/workspace-b/workspace.tsrct
   ```

4. **Compare the contents**:
   - Each file should contain different directories
   - If workspace A shows `["/dir1", "/dir2"]` and workspace B shows `["/dir3"]`, the files are correct

**If the files are different but the UI shows the same directories**, the problem is in the cache or event broadcasting.

### Step 4: Check Process Logs

1. **Look for these log messages** when opening workspaces:

**Workspace A logs (should show PID 1001 for example)**:
```
[Main] Starting in WORKSPACE mode
[Main] Workspace path: /path/to/workspace-a
[WorkspaceMetadataService] readMetadataFile: PID= 1001 file= /path/to/workspace-a/workspace.tsrct
[WorkspaceMetadataService] Read 2 directories from /path/to/workspace-a/workspace.tsrct paths= /dir1, /dir2
[WorkspaceMetadataService] getDirectories called: PID= 1001 workspace= /path/to/workspace-a count= 2
```

**Workspace B logs (should show PID 1002 for example)**:
```
[Main] Starting in WORKSPACE mode
[Main] Workspace path: /path/to/workspace-b
[WorkspaceMetadataService] readMetadataFile: PID= 1002 file= /path/to/workspace-b/workspace.tsrct
[WorkspaceMetadataService] Read 1 directories from /path/to/workspace-b/workspace.tsrct paths= /dir3
[WorkspaceMetadataService] getDirectories called: PID= 1002 workspace= /path/to/workspace-b count= 1
```

**If the PIDs are the same**, you're not running separate processes.

**If the paths are correct but counts/directories are wrong**, there's a cache issue.

## Common Issues and Fixes

### Issue 1: Still Using Old Code

**Symptom**: Only 2 processes appear (launcher + 1 workspace)

**Cause**: Testing with old build before multi-process implementation

**Fix**:
```bash
# Kill all running instances
pkill -f tesseract

# Clean build
npm run clean
npm run build

# Restart
npm run dev
```

### Issue 2: Cache Not Cleared on Workspace Switch

**Symptom**: Different processes, but showing same directories

**Cause**: Cache in `WorkspaceMetadataService` not invalidated properly

**Fix**: This is a code bug. The cache should be cleared when workspace changes, but might not be working in workspace mode startup.

**Temporary workaround**:
1. Close workspace window
2. Reopen workspace
3. Cache should refresh

**Permanent fix needed**: Update `WorkspaceMetadataService.initialize()` to force cache clear in workspace mode:

```typescript
// In workspace-metadata.ts, initialize() method
initialize(): void {
  const workspacePath = this.workspaceService.getCurrent()
  if (workspacePath) {
    // Force clear cache to ensure fresh data
    this.cache = null
    const metadata = this.readMetadataFile(workspacePath)
    console.log(
      '[WorkspaceMetadataService] Initialized with',
      metadata?.settings.directories.length ?? 0,
      'directories'
    )
  } else {
    console.log('[WorkspaceMetadataService] No workspace set, starting empty')
  }

  // Listen for workspace changes to re-initialize
  this.eventBus.on('workspace:changed', (event) => {
    const payload = event.payload as { currentPath: string | null; previousPath: string | null }
    this.handleWorkspaceChanged(payload.currentPath)
  })
}
```

### Issue 3: Workspace Path Not Set Before Service Initialization

**Symptom**: Directories show empty or wrong data

**Cause**: In `index.ts`, the workspace path is set AFTER WindowContext creates services

**Current code**:
```typescript
const workspaceWindow = mainWindow.createWorkspaceWindow() // Creates WindowContext here
// ... WindowContext initializes WorkspaceMetadataService with getCurrent() = null

const context = windowContextManager.get(workspaceWindow.id)
const workspaceService = context.getService<WorkspaceService>('workspace', container)
workspaceService.setCurrent(workspacePath) // Too late! Service already initialized
```

**Fix**: Set workspace path BEFORE creating WindowContext, or delay service initialization:

**Option A: Set workspace first (recommended)**:
```typescript
// Create a pre-configured workspace service
const tempWorkspaceService = new WorkspaceService(storeService, eventBus)
tempWorkspaceService.setCurrent(workspacePath)

// Then create window with this service already configured
// (requires modifying WindowContext to accept pre-configured services)
```

**Option B: Reinitialize after setting path**:
```typescript
const workspaceWindow = mainWindow.createWorkspaceWindow()

const context = windowContextManager.get(workspaceWindow.id)
const workspaceService = context.getService<WorkspaceService>('workspace', container)
workspaceService.setCurrent(workspacePath)

// Force metadata service to reinitialize
const metadataService = context.getService<WorkspaceMetadataService>('workspaceMetadata', container)
metadataService.initialize() // Call again with workspace now set
```

### Issue 4: EventBus Broadcasting to Wrong Windows

**Symptom**: Directories from workspace A appear in workspace B

**Cause**: EventBus.broadcast() sends to all windows in current process

**Diagnosis**: Check if multiple windows are in the same process:

```bash
# List all windows and their processes
ps aux | grep -i electron | grep -i tesseract

# Should show:
# PID 1000 - launcher
# PID 1001 - workspace A (1 window)
# PID 1002 - workspace B (1 window)
```

**If multiple workspace windows share the same PID**, the process spawning is not working.

**Fix**: Ensure `workspace:select-folder` handler spawns new process (see WorkspaceIpc.ts)

## Testing Protocol

After applying fixes, test with this protocol:

1. **Clean start**:
   ```bash
   pkill -f tesseract
   rm -rf /path/to/workspace-a/workspace.tsrct
   rm -rf /path/to/workspace-b/workspace.tsrct
   npm run dev
   ```

2. **Open workspace A**:
   - Add directory `/dir1`
   - Add directory `/dir2`
   - Verify UI shows both directories
   - Check console logs: `PID= [number]`, `workspace= /path/to/workspace-a`, `count= 2`

3. **Keep workspace A open, return to launcher**

4. **Open workspace B**:
   - Should show NO directories (empty)
   - Add directory `/dir3`
   - Verify UI shows only `/dir3`
   - Check console logs: Different PID, `workspace= /path/to/workspace-b`, `count= 1`

5. **Switch back to workspace A**:
   - Should still show `/dir1` and `/dir2`
   - Should NOT show `/dir3`

6. **Check metadata files**:
   ```bash
   cat /path/to/workspace-a/workspace.tsrct # Should contain /dir1, /dir2
   cat /path/to/workspace-b/workspace.tsrct # Should contain /dir3
   ```

## Expected Behavior

With multi-process architecture working correctly:

- **Process isolation**: Each workspace runs in a separate process
- **Data isolation**: Each workspace reads its own `workspace.tsrct` file
- **Cache isolation**: Each process has its own `WorkspaceMetadataService` instance with its own cache
- **Event isolation**: EventBus.broadcast() only sends to windows in the current process

## Verification Checklist

- [ ] Multiple processes appear in Activity Monitor/Task Manager
- [ ] Each process has different PID in logs
- [ ] Each process reads different workspace.tsrct file
- [ ] Directories are isolated (workspace A doesn't see workspace B's directories)
- [ ] Documents are isolated (already working)
- [ ] Cache is cleared when opening new workspace
- [ ] Logs show correct workspace paths for each process

## If Problem Persists

If directories are still not isolated after:
1. Rebuilding the application
2. Verifying multi-process architecture is working
3. Checking workspace paths are correct
4. Verifying separate metadata files

Then the issue is likely:
- Cache not being cleared properly (see Issue 2 fix)
- Workspace path not set before service initialization (see Issue 3 fix)
- Or a timing issue where the UI loads before workspace is fully initialized

Contact the development team with:
- Console logs from both workspace processes
- Process list showing PIDs
- Contents of both workspace.tsrct files
- Screenshots of UI showing the issue
