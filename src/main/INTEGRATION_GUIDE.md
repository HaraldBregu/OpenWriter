# Integration Guide: New IPC Architecture

This guide shows how to integrate the new IPC Module architecture into the existing codebase.

## Phase 3: Integration Steps

### Step 1: ✅ Fixed Duplicate IPC Registration

**File**: `src/main/workspace.ts`

Removed the duplicate `workspace:select-folder` handler that was causing conflicts.

**Before**:
```typescript
ipcMain.handle('workspace:select-folder', async () => { ... })
```

**After**:
```typescript
// Note: 'workspace:select-folder' is now registered in WorkspaceIpc module
```

### Step 2: Using the New Bootstrap (Optional Migration Path)

You can integrate the new architecture in two ways:

#### Option A: Gradual Migration (Recommended)

Keep the existing `index.ts` and gradually adopt new patterns:

```typescript
// In index.ts, add at the top:
import { bootstrapIpcModules, bootstrapServices, setupAppLifecycle } from './bootstrap'

// After creating services, wire up IPC modules:
const { container, eventBus, windowFactory, appState } = bootstrapServices()
bootstrapIpcModules(container, eventBus)
setupAppLifecycle(appState)

// Replace unsafe casts with appState:
// OLD: (app as { isQuitting?: boolean }).isQuitting = true
// NEW: appState.setQuitting()

// Use EventBus instead of getAllWindows().forEach():
// OLD: BrowserWindow.getAllWindows().forEach(win => win.webContents.send('...'))
// NEW: eventBus.broadcast('...')
```

#### Option B: Full Replacement

Replace `index.ts` entirely with the new bootstrap architecture (see example below).

### Step 3: Benefits You Get Immediately

1. **No More Duplicate Registrations** - WorkspaceIpc centralizes workspace IPC
2. **Type-Safe App State** - Replace unsafe casts with AppState
3. **EventBus Broadcasting** - Cleaner renderer communication
4. **Service Lifecycle** - Proper cleanup on app quit
5. **Visible IPC Surface** - All channels in `ipc/` directory

### Step 4: Testing Integration

1. Run type checking:
   ```bash
   npm run typecheck:node
   ```

2. Start dev mode:
   ```bash
   npm run dev
   ```

3. Verify IPC modules are registered:
   - Look for console logs: `[IPC] Registered {module} module`
   - Check that workspace selection still works
   - Verify all existing features work as before

## Example: Minimal Integration

Here's the minimal change to adopt the new architecture:

**Before** (`index.ts`):
```typescript
const mainWindow = new Main(lifecycleService)
```

**After** (`index.ts`):
```typescript
import { bootstrapIpcModules, bootstrapServices } from './bootstrap'

// Bootstrap new architecture
const { container, eventBus } = bootstrapServices()
bootstrapIpcModules(container, eventBus)

// Existing code continues to work
const mainWindow = new Main(lifecycleService)
```

## Migration Checklist

- [x] Phase 1: Core infrastructure created
- [x] Phase 2: All IPC modules created
- [x] Phase 3: Duplicate IPC bug fixed
- [ ] Phase 4: Update Main class to use WindowFactory
- [ ] Phase 5: Replace unsafe app.isQuitting casts with AppState
- [ ] Phase 6: Replace broadcast patterns with EventBus
- [ ] Phase 7: Remove IPC handlers from Main constructor
- [ ] Phase 8: Full cleanup and documentation

## Next Steps

Choose your migration path:

1. **Conservative**: Use new IPC modules alongside existing code
2. **Progressive**: Gradually refactor Main class piece by piece
3. **Aggressive**: Full rewrite using bootstrap.ts as template

All three paths are valid and the new architecture supports incremental adoption.

## Rollback Plan

If issues arise, the new architecture can be completely removed:
1. Restore the `workspace:select-folder` handler in `workspace.ts`
2. Remove the `bootstrap.ts` import from `index.ts`
3. The existing architecture continues to work unchanged

## Support

Questions or issues? Check:
- `src/main/core/` - Core infrastructure implementations
- `src/main/ipc/` - All IPC module implementations
- `src/main/bootstrap.ts` - Integration example
