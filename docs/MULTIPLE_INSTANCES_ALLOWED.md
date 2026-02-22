# Multiple Instances Allowed

## Overview

The application **allows unlimited instances** to run simultaneously. Users can:
- Launch the app multiple times (multiple launcher instances)
- Each launcher can spawn multiple workspaces
- Run as many processes as they want

**No single instance lock is enforced.**

## Behavior

### Multiple Launchers

**User launches app multiple times:**
- First launch: Launcher window 1 opens ✅
- Second launch: Launcher window 2 opens ✅
- Third launch: Launcher window 3 opens ✅
- All launchers run independently ✅

### Multiple Workspaces per Launcher

**Each launcher can spawn unlimited workspaces:**
- Launcher 1 → Workspace A, Workspace B ✅
- Launcher 2 → Workspace C, Workspace D ✅
- All processes run simultaneously ✅

### Complete Independence

**Each launcher instance:**
- Has its own process ID (PID)
- Has its own memory space
- Has its own event bus
- Can spawn its own workspaces
- Operates completely independently

## Architecture

### Process Hierarchy

```
Launcher Instance 1 (PID 1001)
├─ Workspace A (PID 2001)
└─ Workspace B (PID 3001)

Launcher Instance 2 (PID 1002)
├─ Workspace C (PID 2002)
└─ Workspace D (PID 3002)

Launcher Instance 3 (PID 1003)
└─ Workspace E (PID 2003)

All running independently!
```

### No Instance Lock

Location: `/src/main/services/lifecycle.ts`

```typescript
export class LifecycleService {
  constructor() {
    // No single instance lock - allow multiple instances of the app
    console.log('[LifecycleService] Multiple instances allowed - no single instance lock')
    this.pushEvent('app-initialized', 'LifecycleService initialized')
  }

  initialize(): void {
    this.appReadyAt = Date.now()
    this.pushEvent('app-ready', `Platform: ${process.platform}`)

    app.on('before-quit', () => {
      this.pushEvent('before-quit')
    })

    app.on('window-all-closed', () => {
      this.pushEvent('window-all-closed')
    })

    app.on('activate', () => {
      this.pushEvent('activate')
    })
  }

  // No second-instance handlers
  // No single instance lock enforcement
}
```

### Clean Implementation

**Removed**:
- ❌ `app.requestSingleInstanceLock()`
- ❌ `app.on('second-instance')` handler
- ❌ `onSecondInstanceFile` callback
- ❌ `onSecondInstanceLaunch` callback
- ❌ `setCallbacks()` method
- ❌ `isSingleInstance` property

**Kept**:
- ✅ Simple lifecycle event tracking
- ✅ App ready/quit event handlers
- ✅ Platform detection
- ✅ Restart functionality

## Use Cases

### Use Case 1: Multiple Workspaces Across Launchers

**Scenario**: Developer working on multiple projects

```
Developer opens Launcher 1
  → Opens Workspace "Project A"
  → Opens Workspace "Project B"

Developer opens Launcher 2 (separate instance)
  → Opens Workspace "Project C"
  → Opens Workspace "Project D"

All 6 processes (2 launchers + 4 workspaces) run simultaneously
Developer can organize projects across different launcher windows
```

### Use Case 2: Testing Multiple Configurations

**Scenario**: QA testing different workspace setups

```
Tester opens Launcher 1
  → Opens Workspace with Configuration A
  → Tests feature X

Tester opens Launcher 2 (separate instance)
  → Opens Workspace with Configuration B
  → Tests feature X in parallel

Tester compares results side-by-side
Both launcher instances remain independent
```

### Use Case 3: Multi-User Development Machine

**Scenario**: Multiple users on same machine (separate sessions)

```
User 1 (Session 1)
  → Launches app → Launcher 1
  → Opens their workspaces

User 2 (Session 2)
  → Launches app → Launcher 2
  → Opens their workspaces

Each user has completely separate app instance
No interference between users
```

### Use Case 4: Development and Production

**Scenario**: Running dev and production builds simultaneously

```
Developer launches dev build
  → Opens test workspace

Developer launches production build (separate instance)
  → Opens production workspace

Both builds run simultaneously for comparison
```

## Testing

### Test 1: Multiple Launchers

**Steps**:
1. Launch the app (launcher 1 opens)
2. Launch the app again (launcher 2 opens)
3. Launch the app a third time (launcher 3 opens)

**Expected Result**:
- ✅ 3 separate launcher windows
- ✅ 3 separate processes
- ✅ All launchers fully functional

**Verification**:
```bash
ps aux | grep -i tesseract | grep -v workspace | wc -l
# Should show: 3 (three launcher processes)
```

### Test 2: Multiple Workspaces per Launcher

**Steps**:
1. Launch the app (launcher 1)
2. Open workspace A from launcher 1
3. Open workspace B from launcher 1
4. Launch the app again (launcher 2)
5. Open workspace C from launcher 2
6. Open workspace D from launcher 2

**Expected Result**:
- ✅ 2 launchers
- ✅ 4 workspaces (2 per launcher)
- ✅ 6 total processes

**Verification**:
```bash
ps aux | grep -i tesseract | wc -l
# Should show: 6 processes total
# 2 launchers + 4 workspaces
```

### Test 3: Independence Verification

**Steps**:
1. Open launcher 1, add directory to workspace A
2. Open launcher 2, check workspace B
3. Verify workspace B doesn't show directory from workspace A

**Expected Result**:
- ✅ Each launcher has independent state
- ✅ Workspaces are isolated per launcher
- ✅ No data leakage between instances

## Process List Examples

### Example 1: Single Launcher with Workspaces

```bash
ps aux | grep tesseract

# Output:
user 1001 ... tesseract-ai                          # launcher
user 2001 ... tesseract-ai --workspace /path/a      # workspace A
user 3001 ... tesseract-ai --workspace /path/b      # workspace B
```

### Example 2: Multiple Launchers with Workspaces

```bash
ps aux | grep tesseract

# Output:
user 1001 ... tesseract-ai                          # launcher 1
user 2001 ... tesseract-ai --workspace /path/a      # launcher 1 → workspace A
user 3001 ... tesseract-ai --workspace /path/b      # launcher 1 → workspace B

user 1002 ... tesseract-ai                          # launcher 2
user 2002 ... tesseract-ai --workspace /path/c      # launcher 2 → workspace C
user 3002 ... tesseract-ai --workspace /path/d      # launcher 2 → workspace D
```

### Example 3: Maximum Independence

```bash
ps aux | grep tesseract

# Output:
user 1001 ... tesseract-ai                          # launcher 1
user 1002 ... tesseract-ai                          # launcher 2
user 1003 ... tesseract-ai                          # launcher 3
user 2001 ... tesseract-ai --workspace /path/a      # workspace
user 2002 ... tesseract-ai --workspace /path/b      # workspace
user 2003 ... tesseract-ai --workspace /path/c      # workspace
user 2004 ... tesseract-ai --workspace /path/d      # workspace
user 2005 ... tesseract-ai --workspace /path/e      # workspace
```

## Console Logs

### First Instance Launch

```
[Main] Starting in LAUNCHER mode
[LifecycleService] Multiple instances allowed - no single instance lock
[LifecycleService] app-initialized: LifecycleService initialized
[Bootstrap] Bootstrapping core infrastructure...
[Main] Launcher window created
```

### Second Instance Launch (No blocking!)

```
[Main] Starting in LAUNCHER mode
[LifecycleService] Multiple instances allowed - no single instance lock
[LifecycleService] app-initialized: LifecycleService initialized
[Bootstrap] Bootstrapping core infrastructure...
[Main] Launcher window created
```

**Notice**: No "already running" or "second instance blocked" messages!

## Benefits

### Maximum Flexibility

- Users can run as many instances as they want
- No artificial limitations
- Freedom to organize workflows as needed

### Clean Architecture

- Simpler code (no instance lock logic)
- Fewer edge cases to handle
- Less complexity in lifecycle management

### Development Friendly

- Easy to test multiple configurations
- Run dev and prod builds simultaneously
- No need to quit existing instances

### Multi-User Support

- Different users can run separate instances
- No conflicts between user sessions
- Better for shared development machines

## Considerations

### Resource Usage

**Memory**:
- Each launcher: ~40-60 MB
- Each workspace: ~80-120 MB
- Multiple instances multiply memory usage

**Example**: 3 launchers + 6 workspaces = ~300-450 MB total

### Process Management

Users are responsible for:
- Managing open instances
- Closing unused instances
- Monitoring resource usage

**No automatic cleanup** - instances remain open until user quits them.

### File Conflicts

**Potential issue**: Multiple instances accessing same workspace

**Example**:
```
Launcher 1 → Opens Workspace A (/path/workspace)
Launcher 2 → Opens Workspace A (/path/workspace)  ← Same path!
```

**Result**: Both instances read/write same `workspace.tsrct` file

**Mitigation**: Multi-process architecture ensures each workspace process has isolated services, but file system operations can still conflict.

**Recommendation**: Users should avoid opening same workspace in multiple launchers simultaneously.

## Platform Behavior

### macOS

**Dock Icons**:
- Each launcher instance shows as separate window
- All instances grouped under single app icon
- Can Cmd+Tab between instances

**File Associations**:
- .tsrct files open in NEW launcher instance (default macOS behavior)
- Each file gets its own launcher + window

### Windows

**Taskbar**:
- Multiple launcher windows grouped under app icon
- Can Alt+Tab between instances
- Taskbar shows count of open windows

**File Associations**:
- .tsrct files open in NEW launcher instance
- Registry doesn't enforce single instance

### Linux

**Window Manager**:
- Each launcher shows as separate window
- Alt+Tab behavior depends on window manager
- Desktop environments handle grouping differently

## Migration from Single Instance

### What Changed

**Before (Single Instance Lock)**:
```typescript
constructor() {
  if (WorkspaceProcessManager.isLauncherMode()) {
    this.isSingleInstance = app.requestSingleInstanceLock()

    if (!this.isSingleInstance) {
      app.quit()  // Second instance quit
      return
    }

    app.on('second-instance', () => {
      // Focus existing window
    })
  }
}
```

**After (Multiple Instances)**:
```typescript
constructor() {
  // No single instance lock - allow multiple instances
  console.log('[LifecycleService] Multiple instances allowed')
  this.pushEvent('app-initialized', 'LifecycleService initialized')
}
```

### Breaking Changes

**None for end users** - functionality only expands, nothing is removed.

### Code Cleanup

**Removed interfaces**:
- `LifecycleCallbacks` interface
- `onSecondInstanceFile` callback
- `onSecondInstanceLaunch` callback

**Removed methods**:
- `setCallbacks()` method
- Second-instance event handler

**Removed properties**:
- `isSingleInstance` property from `LifecycleState`

## Documentation Updates

**Deprecated**:
- ❌ `/docs/SINGLE_INSTANCE_LOCK.md` (no longer applicable)
- ❌ `/docs/TESTING_SINGLE_INSTANCE.md` (no longer needed)

**Current**:
- ✅ `/docs/MULTIPLE_INSTANCES_ALLOWED.md` (this document)
- ✅ `/docs/MULTI_PROCESS_ARCHITECTURE.md` (still relevant)
- ✅ `/docs/TESTING_MULTI_PROCESS.md` (still relevant)

## Related Documentation

- `/docs/MULTI_PROCESS_ARCHITECTURE.md` - Multi-process workspace architecture
- `/docs/TESTING_MULTI_PROCESS.md` - Testing guide for multiple processes
- `/docs/WINDOW_SCOPED_SERVICES.md` - Window-scoped services architecture

## Summary

The application now allows unlimited instances, providing maximum flexibility for users. Multiple launchers can run simultaneously, each spawning their own workspaces, with complete process isolation and independence.

**Key Points**:
- ✅ No single instance lock
- ✅ Unlimited launcher instances
- ✅ Unlimited workspace instances
- ✅ Complete process isolation
- ✅ Simpler codebase
- ✅ Maximum flexibility
