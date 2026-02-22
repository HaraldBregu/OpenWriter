# Testing Single Instance Lock

## Quick Test Guide

This guide helps you verify that the single instance lock is working correctly.

## Prerequisites

```bash
# Build the application
npm run build

# Start the application
npm run dev
```

## Test 1: Basic Single Instance Lock

### Steps

1. **Launch the app**:
   ```bash
   npm run dev
   ```
   - Launcher window should appear
   - Note: This is the first instance

2. **Open a new terminal**

3. **Try to launch a second instance**:
   ```bash
   npm run dev
   ```

### Expected Results

✅ **Second terminal shows**:
```
[LifecycleService] Another launcher instance already running, quitting
```

✅ **First launcher window**:
- Comes to foreground
- Gets focus
- If minimized, restores automatically

✅ **Process list shows only ONE launcher**:
```bash
ps aux | grep -i electron | grep -i tesseract
# Should show only 1 process (without --workspace flag)
```

### Expected Logs (First Instance)

```
[LifecycleService] Second instance launch attempt detected
[LifecycleService] Command line args: [...]
[LifecycleService] Focusing existing launcher window
[LifecycleService] Callbacks updated: onSecondInstanceFile,onSecondInstanceLaunch
[Main] Second instance launch attempt, focusing launcher window
```

## Test 2: Multiple Workspaces Allowed

### Steps

1. **Launch the app** (launcher opens)

2. **Open Activity Monitor** (macOS) or **Task Manager** (Windows)
   - Filter for "tesseract" or "electron"
   - Note the process count (should be 1)

3. **Select a workspace** from the launcher
   - Click "Select Workspace"
   - Choose `/path/to/workspace-a`

4. **Check process list**:
   - Should now show **2 processes**:
     - 1 launcher (no --workspace flag)
     - 1 workspace A (with --workspace flag)

5. **Keep workspace A open**

6. **Return to launcher window**
   - Click launcher in dock/taskbar
   - Or use Cmd+Tab / Alt+Tab

7. **Select another workspace**:
   - Click "Select Workspace"
   - Choose `/path/to/workspace-b`

8. **Check process list again**:
   - Should now show **3 processes**:
     - 1 launcher
     - 1 workspace A
     - 1 workspace B

### Expected Results

✅ **Process counts**:
- After launcher: 1 process
- After workspace A: 2 processes
- After workspace B: 3 processes

✅ **All processes have different PIDs**:
```bash
ps aux | grep -i tesseract

# Example output:
# user 1000 ... tesseract-ai                    # launcher
# user 1001 ... tesseract-ai --workspace /path/a  # workspace A
# user 1002 ... tesseract-ai --workspace /path/b  # workspace B
```

✅ **Each workspace window is independent**:
- Can add different directories in each workspace
- Closing one workspace doesn't affect others
- Launcher remains open when workspaces close

### Expected Logs (Workspace Processes)

**Workspace A**:
```
[Main] Starting in WORKSPACE mode
[Main] Workspace path: /path/to/workspace-a
[LifecycleService] Workspace mode - multiple instances allowed
```

**Workspace B**:
```
[Main] Starting in WORKSPACE mode
[Main] Workspace path: /path/to/workspace-b
[LifecycleService] Workspace mode - multiple instances allowed
```

## Test 3: File Association (.tsrct files)

### Steps

1. **Launch the app** (launcher opens)

2. **Create a test .tsrct file**:
   ```bash
   echo '{"test": true}' > /tmp/test.tsrct
   ```

3. **Open the file from terminal**:
   ```bash
   open /tmp/test.tsrct
   # macOS

   # Windows (PowerShell)
   Start-Process /tmp/test.tsrct

   # Linux
   xdg-open /tmp/test.tsrct
   ```

### Expected Results

✅ **No new launcher instance**:
- Only one launcher process remains running
- File opens in NEW window within existing instance

✅ **Console logs**:
```
[LifecycleService] Second instance launch attempt detected
[LifecycleService] Second instance opened file: /tmp/test.tsrct
[Main] Second instance opened file: /tmp/test.tsrct
```

✅ **New window opens for the file**:
- Separate window from launcher
- File content loaded
- Launcher window remains open

## Test 4: Minimized/Hidden Launcher

### Steps

1. **Launch the app**

2. **Minimize the launcher window**:
   - macOS: Cmd+M or yellow minimize button
   - Windows: Click minimize button
   - Linux: Click minimize button

3. **Try to launch app again**:
   ```bash
   npm run dev
   ```

### Expected Results

✅ **Launcher window restores**:
- Window unminimizes automatically
- Comes to foreground
- Gets focus

✅ **Console logs**:
```
[LifecycleService] Second instance launch attempt detected
[LifecycleService] Focusing existing launcher window
[LifecycleService] Found 1 windows, focusing first window
[Main] Second instance launch attempt, focusing launcher window
```

## Test 5: Hidden (Dock) on macOS

### Steps (macOS only)

1. **Launch the app**

2. **Hide the app**:
   - Press Cmd+H
   - Or right-click dock icon → Hide

3. **Try to launch app again**:
   ```bash
   npm run dev
   ```

### Expected Results

✅ **App unhides**:
- Window becomes visible
- App comes to foreground
- Window gets focus

✅ **Dock icon behavior**:
- Icon shows app is running
- No second icon appears

## Test 6: Multiple Desktop/Virtual Desktops

### Steps (macOS/Windows 10+/Linux)

1. **Launch the app** on Desktop/Workspace 1

2. **Switch to Desktop/Workspace 2**:
   - macOS: Swipe with 3 fingers or Ctrl+→
   - Windows 10+: Ctrl+Win+→
   - Linux: Ctrl+Alt+→

3. **Try to launch app again** from Desktop 2:
   ```bash
   npm run dev
   ```

### Expected Results

✅ **App switches desktops**:
- View automatically switches to Desktop 1
- Existing launcher window focuses
- No new window created

✅ **Process list unchanged**:
- Still only 1 launcher process
- Same PID as before

## Verification Commands

### Check Process Count

**macOS/Linux**:
```bash
ps aux | grep -i electron | grep -i tesseract | wc -l
# Should show:
# 1 = only launcher running
# 2 = launcher + 1 workspace
# 3 = launcher + 2 workspaces
```

**Windows (PowerShell)**:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*tesseract*"} | Measure-Object
# Count property shows number of processes
```

### Check Process Details

**macOS/Linux**:
```bash
ps aux | grep -i tesseract | grep -v grep
# Shows all tesseract processes with full command line
# Look for --workspace flag to identify workspace processes
```

**Windows (PowerShell)**:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*tesseract*"} | Select-Object Id, ProcessName, StartTime
```

### Check Single Instance Lock Status

In the main process console:
```javascript
// Open DevTools in launcher window (Cmd+Option+I / Ctrl+Shift+I)
// This requires accessing main process logs

// You'll see logs like:
[LifecycleService] Single instance lock acquired
// or
[LifecycleService] Another launcher instance already running, quitting
```

## Common Issues

### Issue: Second Instance Doesn't Focus Window

**Symptom**: Second launch quits but window doesn't focus

**Check**:
1. Look for callback registration logs:
   ```
   [LifecycleService] Callbacks updated: onSecondInstanceFile,onSecondInstanceLaunch
   ```

2. If missing, callback wasn't set properly

**Fix**: Ensure `lifecycleService.setCallbacks()` is called after main window creation

### Issue: Multiple Launchers Running

**Symptom**: Two launcher windows appear

**Check**:
```bash
ps aux | grep tesseract | grep -v workspace | grep -v grep
# Should show only ONE process without --workspace flag
```

**Possible Causes**:
- Running dev and production builds simultaneously
- Different user accounts
- Single instance lock not acquired

**Fix**: Kill all instances and restart:
```bash
pkill -f tesseract
npm run dev
```

### Issue: Workspaces Don't Spawn

**Symptom**: Can only open one workspace

**Check**:
```bash
ps aux | grep "workspace" | wc -l
# Should increase by 1 for each workspace opened
```

**Possible Cause**: Workspace processes incorrectly applying single instance lock

**Fix**: Verify `WorkspaceProcessManager.isWorkspaceMode()` returns `true` in workspace processes

## Success Criteria

After running all tests, you should observe:

✅ **Single Instance Lock**:
- [ ] Only one launcher instance can run
- [ ] Second launch attempts focus existing window
- [ ] Minimized windows restore on second launch
- [ ] Hidden windows show on second launch

✅ **Multiple Workspaces**:
- [ ] Can open multiple workspaces simultaneously
- [ ] Each workspace has separate process
- [ ] Each workspace has different PID
- [ ] Workspaces remain independent

✅ **File Associations**:
- [ ] .tsrct files open in existing launcher
- [ ] New window created for each file
- [ ] No duplicate launcher instances

✅ **Process Management**:
- [ ] 1 launcher process max
- [ ] N workspace processes (no limit)
- [ ] Clean process hierarchy
- [ ] Proper process termination

## Performance Check

### Startup Time

**First Launch**:
```bash
time npm run dev
# Should complete in < 3 seconds
```

**Second Launch (denied)**:
```bash
time npm run dev
# Should quit in < 500ms
```

### Memory Usage

**Single Launcher**:
- Expected: 40-60 MB
- Check: Activity Monitor / Task Manager

**Launcher + 2 Workspaces**:
- Expected: 250-350 MB total
- Breakdown:
  - Launcher: 40-60 MB
  - Workspace 1: 80-120 MB
  - Workspace 2: 80-120 MB

## Automated Testing Ideas

### CLI Test Script

```bash
#!/bin/bash

echo "Test 1: Single instance lock"
npm run dev &
PID1=$!
sleep 2

npm run dev &
PID2=$!
sleep 2

ps -p $PID1 && echo "✅ First instance running"
ps -p $PID2 && echo "❌ Second instance should have quit" || echo "✅ Second instance quit"

kill $PID1 2>/dev/null
```

### Process Count Test

```bash
#!/bin/bash

echo "Test 2: Multiple workspaces"
npm run dev &
sleep 2

COUNT=$(ps aux | grep -i tesseract | grep -v grep | wc -l)
echo "Process count after launcher: $COUNT (expected: 1)"

# Test would need to programmatically open workspaces
# This is a simplified example
```

## Summary

The single instance lock ensures:
- **One launcher instance** maximum (better UX)
- **Multiple workspace instances** allowed (true isolation)
- **Proper window focusing** on second launch attempts
- **File association handling** without duplicate instances

This provides a clean user experience while maintaining the multi-process architecture for workspace isolation.
