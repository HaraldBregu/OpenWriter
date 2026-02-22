# Testing Multi-Process Workspace Architecture

## Overview

This guide explains how to test the new multi-process architecture where each workspace runs in a separate Electron process.

## Prerequisites

1. Build the application with the latest changes:
   ```bash
   npm run build
   ```

2. Start the application in development mode:
   ```bash
   npm run dev
   ```

## Test Scenarios

### Test 1: Basic Process Spawning

**Objective**: Verify that selecting a workspace spawns a new process

**Steps**:
1. Launch the application (launcher process starts)
2. Open Activity Monitor (macOS) or Task Manager (Windows)
3. Filter for "tesseract" or "electron" processes
4. Note the current process count
5. In the app, select a workspace folder
6. Check Activity Monitor/Task Manager again
7. Verify a new process appeared

**Expected Result**:
- Before: 1 process (launcher)
- After: 2 processes (launcher + workspace)

**Logs to Check**:
```
[Main] Starting in LAUNCHER mode
[WorkspaceIpc] Spawning separate process for workspace: /path/to/workspace
[WorkspaceIpc] Workspace process spawned with PID: 12345

// In new process console:
[Main] Starting in WORKSPACE mode
[Main] Workspace path: /path/to/workspace
[Main] Opening workspace in isolated process: /path/to/workspace
[Main] Workspace process ready with PID: 12345
```

### Test 2: Multiple Workspaces

**Objective**: Verify multiple workspaces run as separate processes

**Steps**:
1. Launch the application
2. Select workspace A
3. Return to launcher window (don't close workspace A)
4. Select workspace B
5. Check process list

**Expected Result**:
- 1 launcher process
- 1 process for workspace A
- 1 process for workspace B
- Total: 3 processes

**Verification**:
```bash
# macOS/Linux
ps aux | grep -i electron | grep -i tesseract

# Should show 3 different PIDs
```

### Test 3: Process Independence

**Objective**: Verify workspaces are truly isolated

**Steps**:
1. Open workspace A
2. Open workspace B
3. In workspace A, add a directory to "Directories" page
4. In workspace B, check "Directories" page
5. Verify workspace B does NOT show workspace A's directory

**Expected Result**:
- Workspace A shows its own directories
- Workspace B shows its own directories (or empty if none added)
- No data leakage between workspaces

**Files to Check**:
```bash
# Workspace A metadata
cat /path/to/workspace-a/.tesseract/workspace.tsrct

# Workspace B metadata
cat /path/to/workspace-b/.tesseract/workspace.tsrct

# Should contain different data
```

### Test 4: Crash Isolation

**Objective**: Verify one workspace crash doesn't affect others

**Steps**:
1. Open workspace A
2. Open workspace B
3. Open DevTools in workspace A: `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows)
4. In console, type: `process.crash()`
5. Check that workspace B and launcher still running

**Expected Result**:
- Workspace A process terminates
- Workspace B continues working
- Launcher continues working
- Can open new workspaces

### Test 5: Process Termination

**Objective**: Verify workspace process terminates when window closes

**Steps**:
1. Open a workspace
2. Note the process PID in logs or Activity Monitor
3. Close the workspace window
4. Check process list

**Expected Result**:
- Workspace process terminates immediately
- PID no longer exists
- Launcher process continues running

**Logs to Check**:
```
[Main] Workspace window closed, quitting process
```

### Test 6: Single Instance Lock (Launcher)

**Objective**: Verify only one launcher instance can run

**Steps**:
1. Launch the application (launcher starts)
2. Try to launch the application again
3. Check behavior

**Expected Result**:
- Second launch attempt focuses existing launcher window
- No second launcher process created
- Single instance lock working

### Test 7: Multiple Workspaces Allowed

**Objective**: Verify same workspace can be opened multiple times

**Steps**:
1. Open workspace A
2. Return to launcher
3. Open workspace A again
4. Check process list

**Expected Result**:
- Two separate processes for workspace A
- Both windows work independently
- No single instance lock for workspace processes

**Note**: This behavior may or may not be desired. If you want to prevent multiple instances of the same workspace, additional logic would be needed.

### Test 8: Memory Isolation

**Objective**: Verify workspaces have separate memory spaces

**Steps**:
1. Open workspace A
2. Open DevTools → Memory tab
3. Take heap snapshot
4. Open workspace B
5. Open DevTools → Memory tab
6. Take heap snapshot
7. Compare snapshots

**Expected Result**:
- Completely different heap profiles
- No shared objects between processes
- Memory allocated independently

### Test 9: Command Line Arguments

**Objective**: Verify workspace path passed correctly

**Steps**:
1. Open a workspace
2. Open DevTools console
3. In main process, log: `console.log(process.argv)`
4. Check for workspace arguments

**Expected Result**:
```javascript
[
  '/path/to/electron',
  '/path/to/app',
  '--workspace',
  '/path/to/workspace',
  '--process-type=workspace'
]
```

**Also check environment**:
```javascript
console.log(process.env.ELECTRON_WORKSPACE_MODE) // 'true'
console.log(process.env.ELECTRON_WORKSPACE_PATH) // '/path/to/workspace'
```

### Test 10: File System Operations

**Objective**: Verify file operations work correctly in isolated processes

**Steps**:
1. Open workspace A
2. Add a directory via "Directories" page
3. Verify `.tesseract/workspace.tsrct` file created in workspace A
4. Open workspace B (different folder)
5. Add a directory
6. Verify separate `.tesseract/workspace.tsrct` file in workspace B

**Expected Result**:
- Each workspace writes to its own `.tesseract/` folder
- No file conflicts
- No shared file handles

## Debugging Tips

### View Process Hierarchy

**macOS**:
```bash
pstree -p $(pgrep -f tesseract)
```

**Linux**:
```bash
pstree -p $(pgrep -f electron)
```

**Windows**: Use Process Explorer (shows parent-child relationships)

### Monitor Process Spawning

Add logging in `workspace-process.ts`:
```typescript
spawnWorkspaceProcess(options: WorkspaceProcessOptions): number {
  console.log('[WorkspaceProcess] Spawning with config:', {
    electronPath,
    appPath,
    args,
    env: {
      ELECTRON_WORKSPACE_MODE: 'true',
      ELECTRON_WORKSPACE_PATH: workspacePath
    }
  })

  const child = spawn(electronPath, args, { ... })

  console.log('[WorkspaceProcess] Child process spawned:', {
    pid: child.pid,
    connected: child.connected,
    killed: child.killed
  })

  return child.pid!
}
```

### Check Process Detection

Add logging in `index.ts`:
```typescript
const isWorkspaceMode = WorkspaceProcessManager.isWorkspaceMode()
const workspacePath = WorkspaceProcessManager.getWorkspacePathFromArgs()

console.log('[Main] Process detection:', {
  isWorkspaceMode,
  workspacePath,
  argv: process.argv,
  env: {
    ELECTRON_WORKSPACE_MODE: process.env.ELECTRON_WORKSPACE_MODE,
    ELECTRON_WORKSPACE_PATH: process.env.ELECTRON_WORKSPACE_PATH
  }
})
```

### Verify Service Isolation

In workspace window, check that services are not shared:
```typescript
// Add logging in WindowContext.ts
constructor(config: WindowContextConfig) {
  console.log('[WindowContext] Creating new context:', {
    windowId: config.windowId,
    processId: process.pid,
    containerInstances: {
      workspace: 'NEW INSTANCE',
      workspaceMetadata: 'NEW INSTANCE'
    }
  })
}
```

## Common Issues

### Issue: "Another instance already running"

**Symptom**: Can't open second workspace

**Diagnosis**:
```typescript
// Check if single instance lock applied incorrectly
console.log('Is launcher mode:', WorkspaceProcessManager.isLauncherMode())
console.log('Is workspace mode:', WorkspaceProcessManager.isWorkspaceMode())
```

**Fix**: Ensure `LifecycleService` only applies lock in launcher mode

### Issue: Workspace window shows empty content

**Symptom**: Window opens but no workspace loaded

**Diagnosis**:
```typescript
// In workspace process startup
console.log('Workspace path from args:', WorkspaceProcessManager.getWorkspacePathFromArgs())
console.log('process.argv:', process.argv)
```

**Fix**: Verify `--workspace` argument passed correctly in spawn

### Issue: Process doesn't terminate

**Symptom**: Workspace process stays alive after closing window

**Diagnosis**:
```typescript
// Add logging to window closed handler
workspaceWindow.on('closed', () => {
  console.log('[Main] Workspace window closed, quitting process')
  console.log('Process PID:', process.pid)
  app.quit()
})
```

**Fix**: Ensure `app.quit()` called in workspace mode window close handler

### Issue: Can't open same workspace twice

**Symptom**: Second instance blocked even though it's a workspace

**Diagnosis**: Check `isSingleInstance` value in workspace process

**Fix**: Ensure workspace mode sets `isSingleInstance = false`

## Performance Benchmarks

Use these benchmarks to validate performance:

### Memory Usage per Process
- Launcher (idle): ~40-60 MB
- Workspace (empty): ~80-100 MB
- Workspace (with files): ~120-200 MB

### Startup Times
- Launcher cold start: ~500-800 ms
- Workspace spawn: ~300-500 ms
- Total to workspace: ~800-1300 ms

### Process Spawn Overhead
Measure time from "select workspace" to "workspace window ready":
```typescript
// In WorkspaceIpc
const startTime = Date.now()
const pid = workspaceProcessManager.spawnWorkspaceProcess(...)
const spawnTime = Date.now() - startTime
console.log(`Spawn took ${spawnTime}ms`)
```

Target: < 500ms

## Automated Testing Ideas

### Jest Integration Test

```typescript
describe('Multi-Process Architecture', () => {
  it('should spawn separate process for workspace', async () => {
    const launcher = await startApp()
    const initialProcessCount = await getProcessCount()

    await launcher.selectWorkspace('/path/to/workspace')
    await sleep(1000)

    const newProcessCount = await getProcessCount()
    expect(newProcessCount).toBe(initialProcessCount + 1)
  })

  it('should isolate workspace data', async () => {
    const workspaceA = await openWorkspace('/path/a')
    const workspaceB = await openWorkspace('/path/b')

    await workspaceA.addDirectory('/some/dir')
    const dirsB = await workspaceB.getDirectories()

    expect(dirsB).not.toContain('/some/dir')
  })
})
```

### E2E Testing with Spectron/Playwright

```typescript
test('multiple workspaces run independently', async ({ page }) => {
  // Launch app
  await page.click('[data-testid="select-workspace"]')
  await page.selectDirectory('/workspace-a')

  // Verify new process spawned
  const processes = await getElectronProcesses()
  expect(processes).toHaveLength(2)

  // Open second workspace
  await page.goto('/')
  await page.click('[data-testid="select-workspace"]')
  await page.selectDirectory('/workspace-b')

  // Verify independent processes
  const processesAfter = await getElectronProcesses()
  expect(processesAfter).toHaveLength(3)
})
```

## Rollback Plan

If multi-process architecture causes issues, you can temporarily rollback:

1. Comment out process spawning in `WorkspaceIpc.ts`:
   ```typescript
   // const pid = workspaceProcessManager.spawnWorkspaceProcess(...)
   // Instead, use old in-process window creation:
   mainWindow.createWorkspaceWindow()
   ```

2. Remove workspace mode detection in `index.ts`:
   ```typescript
   // Comment out workspace mode startup logic
   // Use normal launcher startup for all cases
   ```

3. Revert `LifecycleService` single instance lock:
   ```typescript
   // Always apply single instance lock
   this.isSingleInstance = app.requestSingleInstanceLock()
   ```

This reverts to the previous window-scoped architecture while keeping the code changes for future re-enablement.

## Next Steps

After validating multi-process architecture:

1. **Performance Optimization**: Profile memory and CPU usage per process
2. **Error Handling**: Add process crash recovery and restart logic
3. **User Feedback**: Add UI indicators showing which workspace is which process
4. **Telemetry**: Track process spawning, crashes, resource usage
5. **Documentation**: Update user-facing docs explaining workspace isolation

## Support

If you encounter issues during testing:

1. Check logs in DevTools console (both launcher and workspace)
2. Use Activity Monitor/Task Manager to verify process behavior
3. Review `MULTI_PROCESS_ARCHITECTURE.md` for architecture details
4. Add debug logging to `workspace-process.ts` and `index.ts`
5. Test with single workspace first, then multiple workspaces
