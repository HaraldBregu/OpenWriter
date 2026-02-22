# Workspace Isolation Debugging Guide

## Problem Statement

Users report seeing directories from Workspace B when viewing the Directories page in Workspace A, indicating workspace isolation is not working correctly.

## Changes Made

### 1. Added Comprehensive Logging

**File: `/src/main/services/workspace-metadata.ts`**

Added detailed console logging throughout the service to trace:
- When `getDirectories()` is called and from which workspace
- When `getMetadata()` reads from cache vs file
- When `readMetadataFile()` reads from disk
- Complete workspace change event flow with before/after state
- When `directories:changed` events are broadcast

**File: `/src/renderer/src/pages/DirectoriesPage.tsx`**

Added console logging to track:
- Component mount/remount
- When directories are fetched via IPC
- When `directories:changed` events are received
- How many directories are in each update

### 2. Added State Clearing on Component Mount

**File: `/src/renderer/src/store/directoriesSlice.ts`**

Added new action:
```typescript
clearDirectories(state) {
  state.directories = []
  state.error = null
}
```

**File: `/src/renderer/src/pages/DirectoriesPage.tsx`**

Modified `fetchDirectories()` to clear state before fetching:
```typescript
dispatch(clearDirectories())  // Clear stale data
const dirs = await window.api.directoriesList()
dispatch(loadDirectories(dirs))
```

This ensures that if there's any race condition or stale state, it gets cleared before loading fresh data.

## How to Debug

### Step 1: Enable Console Logging

1. Open the Electron app with DevTools visible
2. Open the Console tab
3. Filter for `[WorkspaceMetadataService]` and `[DirectoriesPage]`

### Step 2: Test Workspace Isolation

**Scenario A: Start Fresh**
1. Close the app completely
2. Open the app
3. Select Workspace A (empty directory)
4. Navigate to Directories page
5. Check console logs - you should see:
   ```
   [WorkspaceMetadataService] getDirectories called: workspace= /path/to/workspace-a count= 0
   [DirectoriesPage] Component mounted, fetching directories
   [DirectoriesPage] Received 0 directories from main process
   ```
6. Add some directories to Workspace A
7. Navigate away and back - directories should persist

**Scenario B: Switch Workspaces**
1. Start with Workspace B that has directories
2. Navigate to Directories page - should see Workspace B's directories
3. Navigate back to Welcome page
4. Select Workspace A (different directory, no directories)
5. Navigate to Directories page
6. **Check console logs for the workspace change sequence**:
   ```
   ========== WORKSPACE CHANGED ==========
   New workspace: /path/to/workspace-a
   Cache before clear: /path/to/workspace-b dirs= X
   Pending write: undefined
   Cache cleared (was for workspace: /path/to/workspace-b )
   Reading from file for /path/to/workspace-a
   Read 0 directories from /path/to/workspace-a/workspace.tsrct
   Switched workspace, loaded 0 directories from /path/to/workspace-a
   About to emit directories:changed event
   emitDirectoriesChanged: workspace= /path/to/workspace-a broadcasting 0 directories
   ========== END WORKSPACE CHANGED ==========
   ```
7. Then when DirectoriesPage mounts:
   ```
   [DirectoriesPage] Component mounted, fetching directories
   [WorkspaceMetadataService] getDirectories called: workspace= /path/to/workspace-a count= 0
   [DirectoriesPage] Received 0 directories from main process
   ```
8. **Expected:** Directories page should show 0 directories
9. **If bug persists:** Check if the workspace path in logs is correct

**Scenario C: Rapid Switching**
1. Switch from A to B
2. Immediately click Directories tab (before UI finishes loading)
3. Check if the correct workspace's directories are shown
4. Check console for any race conditions or out-of-order events

### Step 3: Verify File System

For each workspace, check the actual file:

```bash
# Workspace A
cat /path/to/workspace-a/workspace.tsrct

# Workspace B
cat /path/to/workspace-b/workspace.tsrct
```

Verify:
- Files exist in different locations
- Each file contains only its own workspace's directories
- The `directories` array matches what you expect

### Step 4: Check Cache Behavior

Look for these log patterns:

**Cache hit (expected after first read in same workspace):**
```
[WorkspaceMetadataService] getMetadata: Using cache for /path/to/workspace-a
```

**Cache miss (expected after workspace switch):**
```
[WorkspaceMetadataService] getMetadata: Reading from file for /path/to/workspace-a
```

**Cache cleared (expected during workspace change):**
```
[WorkspaceMetadataService] Cache cleared (was for workspace: /path/to/workspace-b )
```

## Common Issues to Look For

### Issue 1: Events Not Firing
**Symptom:** Switching workspace doesn't show "WORKSPACE CHANGED" logs
**Cause:** Workspace change event not being emitted or handler not registered
**Check:** Look for `workspace:changed` event subscription in logs during service initialization

### Issue 2: Wrong Workspace Path
**Symptom:** Logs show reading from wrong workspace path
**Cause:** `workspaceService.getCurrent()` returning stale/wrong path
**Check:** Compare workspace path in logs vs actual workspace selection

### Issue 3: Cache Not Cleared
**Symptom:** After switching, cache still shows old workspace path
**Cause:** `handleWorkspaceChanged` not being called or cache not set to null
**Check:** Look for "Cache cleared" log message

### Issue 4: Redux State Stale
**Symptom:** UI shows old directories even though API returns correct ones
**Cause:** Redux state not being updated by `directories:changed` event
**Check:**
- Look for "[DirectoriesPage] Received directories:changed event" logs
- Verify the event handler is registered (check useEffect dependencies)
- Check if component is mounted when event fires

### Issue 5: File Read from Wrong Location
**Symptom:** Reading correct number of dirs but from wrong workspace
**Cause:** File paths pointing to same location somehow
**Check:**
- Look at full file path in "readMetadataFile" logs
- Verify paths are actually different directories
- Check for symlinks or unusual file system setups

### Issue 6: Race Condition on Mount
**Symptom:** DirectoriesPage mounts before workspace change completes
**Cause:** Navigation happens before workspace change event propagates
**Check:**
- Look at timestamp order of logs
- If "Component mounted" appears before "WORKSPACE CHANGED", that's the issue
- The `clearDirectories()` call should mitigate this

## Expected Log Flow

For a complete workspace switch from B to A, you should see:

```
1. User clicks to switch workspace in UI

2. Main process updates workspace:
   [WorkspaceService] Workspace changed: /workspace-b -> /workspace-a

3. WorkspaceMetadataService handles the change:
   ========== WORKSPACE CHANGED ==========
   New workspace: /workspace-a
   Cache before clear: /workspace-b dirs= 5
   Pending write: undefined
   Cache cleared (was for workspace: /workspace-b )
   Reading from file for /workspace-a
   readMetadataFile: /workspace-a/workspace.tsrct exists= true
   Read 0 directories from /workspace-a/workspace.tsrct
   Switched workspace, loaded 0 directories from /workspace-a
   About to emit directories:changed event
   getDirectories called: workspace= /workspace-a count= 0 cached= true
   emitDirectoriesChanged: workspace= /workspace-a broadcasting 0 directories
   ========== END WORKSPACE CHANGED ==========

4. IF DirectoriesPage is mounted, it receives the event:
   [DirectoriesPage] Received directories:changed event with 0 directories

5. ELSE when DirectoriesPage mounts:
   [DirectoriesPage] Component mounted, fetching directories
   [WorkspaceMetadataService] getMetadata: Using cache for /workspace-a
   getDirectories called: workspace= /workspace-a count= 0 cached= true
   [DirectoriesPage] Received 0 directories from main process
```

## Next Steps If Bug Persists

If the issue continues after these changes:

1. **Capture full console log** of the problem scenario
2. **Check file system** - verify workspace.tsrct files are in correct locations
3. **Verify workspace selection** - ensure different directories are being selected
4. **Check for multiple instances** - ensure only one Electron window is open
5. **Clear app data** - remove any persistent storage that might be interfering
6. **Check for service initialization** - ensure WorkspaceMetadataService is properly initialized

## Additional Debugging Commands

```bash
# Find all workspace.tsrct files
find ~ -name "workspace.tsrct" 2>/dev/null

# Watch workspace.tsrct file for changes
watch -n 1 "cat /path/to/workspace-a/workspace.tsrct | jq '.settings.directories | length'"

# Compare two workspace files
diff <(jq '.settings.directories' /path/to/workspace-a/workspace.tsrct) \
     <(jq '.settings.directories' /path/to/workspace-b/workspace.tsrct)
```
