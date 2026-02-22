# Workspace Metadata Isolation Fix

## Summary

Fixed a critical bug where directories added to one workspace would leak into other workspaces due to a race condition in the debounced write system.

## Problem Description

When users switched between workspaces, directories from one workspace would appear in another workspace. This occurred because:

1. User adds directories to **Workspace A**
2. The service schedules a debounced write (800ms delay)
3. User switches to **Workspace B** before the timer fires
4. The pending write executes, but `writeMetadataFile()` used `this.workspaceService.getCurrent()` which now pointed to Workspace B
5. Result: Workspace A's directories were written to `workspace_B/workspace.tsrct`

## Root Cause

The bug had two components:

### 1. Workspace Path Not Captured During Debounce
```typescript
// BEFORE (buggy):
private scheduleSave(metadata: WorkspaceMetadata): void {
  this.pendingWrite = metadata  // Only stored metadata, not workspace path
  this.debounceTimer = setTimeout(() => {
    if (this.pendingWrite) {
      this.writeMetadataFile(this.pendingWrite)  // Used current workspace path
    }
  }, DEBOUNCE_MS)
}

private writeMetadataFile(metadata: WorkspaceMetadata): void {
  const workspacePath = this.workspaceService.getCurrent()  // BUG: Gets CURRENT workspace
  const filePath = this.getMetadataFilePath(workspacePath)
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8')
}
```

When the user switched workspaces, `getCurrent()` would return the NEW workspace, but the metadata belonged to the OLD workspace.

### 2. No In-Memory Cache for Pending Changes

The refactored code removed caching and always read from disk. This caused:
- Duplicate directory detection to fail (couldn't see pending additions)
- Remove operations to fail (couldn't see pending state)

```typescript
// BEFORE (no cache):
private getMetadata(): WorkspaceMetadata {
  const workspacePath = this.workspaceService.getCurrent()
  const metadata = this.readMetadataFile(workspacePath)  // Always read from disk
  return metadata ?? this.createDefaultMetadata()
}
```

## Solution

### 1. Capture Workspace Path During Debounce

Store the workspace path along with the metadata when scheduling a write:

```typescript
// AFTER (fixed):
private pendingWrite: { metadata: WorkspaceMetadata; workspacePath: string } | null = null

private scheduleSave(metadata: WorkspaceMetadata): void {
  const workspacePath = this.workspaceService.getCurrent()
  if (!workspacePath) return

  // Capture both metadata AND workspace path
  this.pendingWrite = { metadata, workspacePath }

  this.debounceTimer = setTimeout(() => {
    if (this.pendingWrite) {
      // Write to the captured workspace path, not the current one
      this.writeMetadataFile(this.pendingWrite.metadata, this.pendingWrite.workspacePath)
    }
  }, DEBOUNCE_MS)
}

private writeMetadataFile(metadata: WorkspaceMetadata, workspacePath: string): void {
  // Use the provided workspace path, not getCurrent()
  const filePath = this.getMetadataFilePath(workspacePath)
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8')
}
```

### 2. Add In-Memory Cache with Workspace Tracking

Maintain a cache that tracks which workspace the cached data belongs to:

```typescript
private cache: { metadata: WorkspaceMetadata; workspacePath: string } | null = null

private getMetadata(): WorkspaceMetadata {
  const workspacePath = this.workspaceService.getCurrent()
  if (!workspacePath) return this.createDefaultMetadata()

  // Return cached metadata if it's for the current workspace
  if (this.cache && this.cache.workspacePath === workspacePath) {
    return this.cache.metadata
  }

  // Cache miss or workspace changed - read from file
  const metadata = this.readMetadataFile(workspacePath) ?? this.createDefaultMetadata()
  this.cache = { metadata, workspacePath }
  return metadata
}

private scheduleSave(metadata: WorkspaceMetadata): void {
  const workspacePath = this.workspaceService.getCurrent()
  if (!workspacePath) return

  this.pendingWrite = { metadata, workspacePath }

  // Update cache so pending changes are immediately visible
  this.cache = { metadata, workspacePath }

  // ... rest of debounce logic
}

private handleWorkspaceChanged(newPath: string | null): void {
  this.flush()

  // Clear cache to force fresh read from new workspace
  this.cache = null

  this.emitDirectoriesChanged()
}
```

## Testing

Created comprehensive tests in `/tests/unit/main/services/workspace-metadata.test.ts`:

### Test Scenarios

1. **Workspace Isolation During Debounced Writes**
   - Add directory to Workspace A
   - Switch to Workspace B before timer fires
   - Verify Workspace A gets the directory, not Workspace B

2. **Rapid Workspace Switching**
   - Add to Workspace A, switch to B, add to B, switch back to A
   - Verify each workspace maintains only its own directories

3. **Event Handler Integration**
   - Test `workspace:changed` event handling
   - Verify pending writes flush to correct workspace

4. **Duplicate Detection**
   - Verify duplicate directories are rejected
   - Tests that cache is working

5. **Remove Operations**
   - Verify directories can be removed
   - Tests that cache reflects mutations

All tests pass successfully.

## Files Modified

### Core Service
- `/src/main/services/workspace-metadata.ts`
  - Added `cache` field to store in-memory metadata
  - Modified `pendingWrite` to include workspace path
  - Updated `scheduleSave()` to capture workspace path
  - Updated `writeMetadataFile()` to accept workspace path parameter
  - Updated `getMetadata()` to use cache with workspace validation
  - Updated `handleWorkspaceChanged()` to clear cache
  - Updated `flush()` to use captured workspace path

### Tests
- Created `/tests/unit/main/services/workspace-metadata.test.ts`
  - 11 tests covering workspace isolation scenarios
  - Tests for bug fix, duplicate detection, removal, etc.

## Impact

This fix ensures complete workspace isolation:

- ✅ Directories added to Workspace A stay in Workspace A
- ✅ Switching workspaces flushes pending writes to the correct location
- ✅ Each workspace maintains its own independent `workspace.tsrct` file
- ✅ Duplicate detection works correctly with pending changes
- ✅ Remove operations work correctly with pending changes
- ✅ No data corruption or cross-contamination between workspaces

## Verification

To verify the fix works in production:

1. Open Workspace A
2. Add directories to Workspace A
3. Immediately open Workspace B (within 800ms)
4. Check `workspace_A/workspace.tsrct` - should contain Workspace A's directories
5. Check `workspace_B/workspace.tsrct` - should be empty or contain only Workspace B's directories
6. Add directories to Workspace B
7. Switch back to Workspace A
8. Verify each workspace still has only its own directories

## Future Improvements

Consider these enhancements:

1. **Add telemetry** to track workspace switch events with pending writes
2. **Add validation** to detect corrupted workspace files on load
3. **Add migration** tool if workspace format changes in future
4. **Consider SQLite** for workspace metadata instead of JSON files (better for concurrent access)

## Related Documentation

- [LOGGER_IMPLEMENTATION.md](/docs/LOGGER_IMPLEMENTATION.md) - Similar patterns for service isolation
- [LOGGER_QUICK_START.md](/docs/LOGGER_QUICK_START.md) - Service initialization patterns
