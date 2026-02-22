# Menu "New Workspace" Fix

## Problem

Clicking **"File → New Workspace"** from the menu was opening a new window in the current process instead of spawning a new Electron instance.

## Root Cause

The menu callback in `/src/main/index.ts` was calling:

```typescript
onNewWorkspace: () => {
  mainWindow.createWorkspaceWindow()  // ❌ Creates window in current process
}
```

This created a new `BrowserWindow` in the **same Electron process**, which goes against the multi-process architecture where each workspace should run in a **separate process**.

## Solution

Updated the menu callback to spawn a new Electron instance instead:

```typescript
onNewWorkspace: async () => {
  // Show folder selection dialog
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Workspace Folder',
    buttonLabel: 'Select Workspace'
  })

  // If user selected a folder, spawn a new Electron instance
  if (!result.canceled && result.filePaths.length > 0) {
    const workspacePath = result.filePaths[0]

    logger.info('Menu', `Spawning separate process for workspace: ${workspacePath}`)

    // Create WorkspaceProcessManager instance
    const workspaceProcessManager = new WorkspaceProcessManager(logger)

    // Spawn a new Electron instance for this workspace
    const pid = workspaceProcessManager.spawnWorkspaceProcess({
      workspacePath,
      logger
    })

    logger.info('Menu', `Workspace process spawned with PID: ${pid}`)
  }
}
```

## Changes Made

### File: `/src/main/index.ts`

**1. Added import for `dialog`**:
```typescript
import { app, BrowserWindow, nativeTheme, dialog } from 'electron'
```

**2. Updated `onNewWorkspace` callback**:
- Changed from synchronous to `async`
- Added `dialog.showOpenDialog()` to select workspace folder
- Added `WorkspaceProcessManager` instantiation
- Added `spawnWorkspaceProcess()` call to spawn new instance
- Added logging to track process spawning

## Behavior After Fix

### Before

```
User clicks "File → New Workspace"
    ↓
Opens folder picker dialog
    ↓
Creates new BrowserWindow in SAME process ❌
    ↓
Both windows share same main process
    ↓
Not truly isolated
```

### After

```
User clicks "File → New Workspace"
    ↓
Opens folder picker dialog
    ↓
Spawns NEW Electron process ✅
    ↓
New process with separate PID
    ↓
Complete isolation
```

## Testing

### Test 1: Menu Spawns New Process

**Steps**:
1. Launch the app (launcher opens)
2. Check Activity Monitor: 1 process
3. Click **"File → New Workspace"** (macOS) or use keyboard shortcut `Cmd+Shift+N`
4. Select a workspace folder
5. Check Activity Monitor: Should now show 2 processes

**Expected Result**:
- ✅ New Electron process spawns
- ✅ New workspace window opens in separate process
- ✅ Different PID from launcher

**Console Logs**:
```
[Menu] Spawning separate process for workspace: /path/to/workspace
[WorkspaceProcess] Spawning new process for workspace: /path/to/workspace
[Menu] Workspace process spawned with PID: 12345
```

### Test 2: Multiple Workspaces via Menu

**Steps**:
1. Launch the app
2. Click "File → New Workspace" → Select workspace A
3. Click "File → New Workspace" → Select workspace B
4. Check process list

**Expected Result**:
- ✅ 3 processes total (1 launcher + 2 workspaces)
- ✅ Each workspace has different PID
- ✅ All processes run independently

**Verification**:
```bash
ps aux | grep tesseract

# Expected output:
# PID 1001 - launcher
# PID 2001 - workspace A (--workspace flag)
# PID 3001 - workspace B (--workspace flag)
```

### Test 3: Cancel Dialog

**Steps**:
1. Launch the app
2. Click "File → New Workspace"
3. Click "Cancel" in folder picker dialog

**Expected Result**:
- ✅ No new process spawns
- ✅ Launcher remains open
- ✅ No errors in console

### Test 4: Keyboard Shortcut

**Steps**:
1. Launch the app
2. Press `Cmd+Shift+N` (macOS) or `Ctrl+Shift+N` (Windows/Linux)
3. Select a workspace folder

**Expected Result**:
- ✅ Same behavior as clicking menu item
- ✅ New process spawns
- ✅ Workspace opens in separate process

## Comparison with UI Workspace Selection

Both methods now work the same way:

### Method 1: Menu "File → New Workspace"

```typescript
// In index.ts (menu callback)
onNewWorkspace: async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Workspace Folder',
    buttonLabel: 'Select Workspace'
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const workspacePath = result.filePaths[0]
    const workspaceProcessManager = new WorkspaceProcessManager(logger)
    const pid = workspaceProcessManager.spawnWorkspaceProcess({
      workspacePath,
      logger
    })
  }
}
```

### Method 2: UI Button "Select Workspace"

```typescript
// In WorkspaceIpc.ts (IPC handler)
ipcMain.handle('workspace:select-folder',
  wrapSimpleHandler(async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Workspace Folder',
      buttonLabel: 'Select Workspace'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const workspacePath = result.filePaths[0]
      const workspaceProcessManager = new WorkspaceProcessManager(logger)
      const pid = workspaceProcessManager.spawnWorkspaceProcess({
        workspacePath,
        logger
      })
    }
  })
)
```

**Both use the same process spawning logic!** ✅

## Platform Behavior

### macOS

**Menu Location**: Application menu bar → **File → New Workspace**

**Keyboard Shortcut**: `Cmd+Shift+N`

**Dialog**: Native macOS folder picker
- Shows "Select Workspace Folder" title
- "Select Workspace" button
- Can create new folder inline

### Windows

**Menu Location**: Not shown (Windows uses custom React TitleBar)

**Keyboard Shortcut**: `Ctrl+Shift+N` (works globally)

**Dialog**: Native Windows folder picker
- Shows folder tree
- "Select Workspace" button
- Can create new folder

### Linux

**Menu Location**: Not shown (Linux uses custom React TitleBar)

**Keyboard Shortcut**: `Ctrl+Shift+N` (works globally)

**Dialog**: Native Linux folder picker (depends on desktop environment)
- GTK/Qt file picker
- Varies by distribution

## Alternative: Custom React TitleBar

On Windows and Linux, the native menu is removed (line 175 in `menu.ts`):

```typescript
if (!isMac) {
  // On Windows/Linux the custom React TitleBar handles all menu actions.
  // Remove the native menu bar entirely (including the Alt-key overlay).
  ElectronMenu.setApplicationMenu(null)
  return
}
```

**This means**:
- macOS: Menu shows in application menu bar ✅
- Windows/Linux: Menu doesn't show, but keyboard shortcut works ✅

**To add menu to React TitleBar** (future enhancement):
1. Update `src/renderer/src/components/TitleBar.tsx`
2. Add "File" menu dropdown
3. Add "New Workspace" item
4. Call `window.api.workspace.selectFolder()` when clicked

## Console Logs

### Successful Workspace Spawn

```
[Menu] Spawning separate process for workspace: /Users/user/workspace-a
[WorkspaceProcess] Spawning new process for workspace: /Users/user/workspace-a
[WorkspaceProcess] Electron path: /Applications/Tesseract AI.app/Contents/MacOS/Tesseract AI
[WorkspaceProcess] App path: /Applications/Tesseract AI.app/Contents/Resources/app.asar
[WorkspaceProcess] Args: [
  '/Applications/Tesseract AI.app/Contents/Resources/app.asar',
  '--workspace',
  '/Users/user/workspace-a',
  '--process-type=workspace'
]
[WorkspaceProcess] Child process spawned: {
  pid: 12345,
  connected: false,
  killed: false
}
[Menu] Workspace process spawned with PID: 12345

// In new process:
[Main] Starting in WORKSPACE mode
[Main] Workspace path: /Users/user/workspace-a
[LifecycleService] Multiple instances allowed - no single instance lock
[WorkspaceMetadataService] Initialized with 2 directories from /Users/user/workspace-a
[Main] Workspace process ready with PID: 12345
```

### Cancelled Dialog

```
[Menu] Spawning separate process for workspace: (nothing logged)
// No process spawned
```

## Related Files

- `/src/main/index.ts` - Menu callback registration (FIXED)
- `/src/main/menu.ts` - Menu definition (no changes needed)
- `/src/main/workspace-process.ts` - Process spawning logic
- `/src/main/ipc/WorkspaceIpc.ts` - IPC handler for UI workspace selection

## Related Documentation

- `/docs/MULTI_PROCESS_ARCHITECTURE.md` - Multi-process architecture overview
- `/docs/MULTIPLE_INSTANCES_ALLOWED.md` - Multiple instances behavior
- `/docs/TESTING_MULTI_PROCESS.md` - Testing guide for multi-process features

## Summary

The "File → New Workspace" menu action now correctly:
- ✅ Shows native folder picker dialog
- ✅ Spawns new Electron instance (separate process)
- ✅ Opens workspace in isolated process
- ✅ Works consistently with UI workspace selection
- ✅ Supports keyboard shortcut `Cmd+Shift+N` / `Ctrl+Shift+N`
- ✅ Logs process spawning for debugging

This ensures all methods of opening workspaces (menu, UI button, keyboard shortcut) use the same multi-process architecture.
