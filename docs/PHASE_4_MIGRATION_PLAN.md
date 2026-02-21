# Phase 4 Migration Plan: Main Class Refactor

**Objective**: Remove all IPC handlers from Main class and enable IPC modules

**Estimated Time**: 2-3 hours
**Risk Level**: Medium (mitigated with testing)
**Complexity**: Moderate

## Executive Summary

The `Main` class currently has:
- **708 lines** of code
- **79 IPC handlers** in the constructor
- **12 service instances** manually created
- Mixed responsibilities (window management + IPC routing + service container)

**Goal**: Reduce Main class to ~150 lines focused only on window management.

## Current State Analysis

### Main Class Structure (src/main/main.ts)

```
Lines 1-36:   Imports and class properties
Lines 37-550: Constructor (513 lines!)
  Lines 38-51:  Service instantiation (12 services)
  Lines 54-550: IPC handler registration (79 handlers)
Lines 551-708: Window management methods
```

### IPC Handlers by Module (79 total)

| Module | Handlers | Lines | Status |
|--------|----------|-------|--------|
| MediaPermissions | 5 | 102-122 | ✅ IPC module ready |
| Bluetooth | 3 | 123-134 | ✅ IPC module ready |
| Network | 4 | 136-156 | ✅ IPC module ready |
| Cron | 8 | 157-201 | ✅ IPC module ready |
| WindowManager | 7 | 202-236 | ✅ IPC module ready |
| Filesystem | 8 | 237-282 | ✅ IPC module ready |
| Dialog | 4 | 283-304 | ✅ IPC module ready |
| Notification | 2 | 305-316 | ✅ IPC module ready |
| Clipboard | 12 | 317-364 | ✅ IPC module ready |
| Store | 9 | 365-396 | ✅ IPC module ready |
| Workspace | 2 | 398-422 | ✅ IPC module ready |
| Agent | 13 | 423-502 | ⚠️ Already self-contained |
| Custom | 2 | 54-100 | ⚠️ Needs analysis |

**Total Lines to Remove**: ~450 lines of IPC handlers

## Migration Strategy

### Approach: Big Bang with Safety Net

**Why Big Bang**:
- IPC modules are already created and tested
- All handlers are mapped 1:1
- Reduces intermediate broken states
- Faster completion

**Safety Net**:
- Full backup before changes
- Step-by-step verification
- Immediate rollback if issues
- Comprehensive testing checklist

## Step-by-Step Execution Plan

### Pre-Migration Checklist

- [ ] Commit all current changes
- [ ] Create backup branch: `git checkout -b backup-pre-phase4`
- [ ] Run full test suite: `npm run typecheck && npm run build`
- [ ] Document current app behavior
- [ ] Create rollback script

### Step 1: Backup and Preparation (15 min)

```bash
# 1. Commit current state
git add .
git commit -m "chore: prepare for Phase 4 migration"

# 2. Create backup branch
git checkout -b backup-pre-phase4
git checkout main

# 3. Create migration branch
git checkout -b phase4-main-class-refactor

# 4. Verify builds work
npm run build
```

### Step 2: Update Main Class Constructor (30 min)

**File**: `src/main/main.ts`

**Current Constructor** (lines 37-550, ~513 lines):
```typescript
constructor(lifecycleService: LifecycleService) {
  // Service instantiation (12 services)
  this.mediaPermissions = new MediaPermissionsService()
  // ... 11 more services

  // 79 IPC handler registrations
  ipcMain.handle('bluetooth-is-supported', ...)
  // ... 78 more handlers
}
```

**New Constructor** (~10 lines):
```typescript
constructor(
  private lifecycleService: LifecycleService,
  private container: ServiceContainer
) {
  // No service instantiation - comes from container
  // No IPC handlers - handled by IPC modules
}
```

**Actions**:
1. Remove lines 38-51 (service instantiation)
2. Remove lines 54-550 (all IPC handlers except custom ones)
3. Keep lines 54-100 (custom context menu handlers - analyze separately)
4. Update constructor signature to accept ServiceContainer

**Expected Result**: Constructor reduces from ~513 lines to ~50 lines

### Step 3: Update Service Access Pattern (20 min)

**Current Pattern**:
```typescript
private mediaPermissions: MediaPermissionsService
private bluetoothService: BluetoothService
// ... 10 more private fields
```

**New Pattern**:
```typescript
// Remove private fields, use container instead
private get storeService() {
  return this.container.get<StoreService>('store')
}
// Repeat for services needed by window methods
```

**Actions**:
1. Remove 12 private service field declarations
2. Add container getter methods for services used in window methods
3. Update window methods to use getters

### Step 4: Analyze Custom Handlers (15 min)

**Custom Handlers** (lines 54-100):
```typescript
ipcMain.on('play-sound', () => { ... })
ipcMain.on('context-menu', (event) => { ... })
ipcMain.on('context-menu-editable', (event) => { ... })
```

**Decision Required**:
- [ ] Keep in Main class (window-specific)?
- [ ] Move to new CustomIpc module?
- [ ] Move to WindowIpc module?

**Recommendation**: Create `CustomIpc` module for non-standard handlers

### Step 5: Update index.ts to Use Container (10 min)

**File**: `src/main/index.ts`

**Current**:
```typescript
const { container, appState } = bootstrapServices()
// IPC modules disabled
const mainWindow = new Main(lifecycleService)
```

**New**:
```typescript
const { container, eventBus, appState } = bootstrapServices()
bootstrapIpcModules(container, eventBus)  // ENABLE
const mainWindow = new Main(lifecycleService, container)
```

**Actions**:
1. Uncomment `bootstrapIpcModules()` call
2. Import `eventBus` back
3. Pass `container` to Main constructor
4. Remove workspace handler restoration (now in WorkspaceIpc)

### Step 6: Create CustomIpc Module (15 min)

**File**: `src/main/ipc/CustomIpc.ts`

```typescript
import { ipcMain, Menu } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'

export class CustomIpc implements IpcModule {
  readonly name = 'custom'

  register(_container: ServiceContainer, _eventBus: EventBus): void {
    // Play sound handler
    ipcMain.on('play-sound', () => {
      // TODO: Implement or remove
    })

    // Context menu handlers
    ipcMain.on('context-menu', (event) => {
      const template = [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
      const menu = Menu.buildFromTemplate(template as any)
      menu.popup({ window: BrowserWindow.fromWebContents(event.sender)! })
    })

    ipcMain.on('context-menu-editable', (event) => {
      const template = [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
      const menu = Menu.buildFromTemplate(template as any)
      menu.popup({ window: BrowserWindow.fromWebContents(event.sender)! })
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
```

**Action**: Add to `src/main/ipc/index.ts` exports

### Step 7: Update Main Class Properties (10 min)

**Remove** (lines 15-36):
```typescript
private mediaPermissions: MediaPermissionsService
private bluetoothService: BluetoothService
private networkService: NetworkService
private cronService: CronService
private lifecycleService: LifecycleService
private windowManagerService: WindowManagerService
private filesystemService: FilesystemService
private dialogService: DialogService
private notificationService: NotificationService
private clipboardService: ClipboardService
private storeService: StoreService
private agentService: AgentService
private ragController: RagController
```

**Keep**:
```typescript
private window: BrowserWindow | null = null
private currentWorkspace: string | null = null
private onVisibilityChange?: () => void
```

**Add**:
```typescript
private lifecycleService: LifecycleService
private container: ServiceContainer
```

### Step 8: Refactor Main Class (Final Structure)

**Target Structure** (~150 lines):

```typescript
export class Main {
  private window: BrowserWindow | null = null
  private currentWorkspace: string | null = null
  private onVisibilityChange?: () => void

  constructor(
    private lifecycleService: LifecycleService,
    private container: ServiceContainer
  ) {
    // Minimal initialization only
  }

  // Window management methods (unchanged)
  create(): BrowserWindow { ... }
  createWindowForFile(filePath: string): BrowserWindow { ... }
  showOrCreate(): BrowserWindow { ... }
  hide(): void { ... }
  toggleVisibility(): void { ... }
  isVisible(): boolean { ... }
  setOnWindowVisibilityChange(callback: () => void): void { ... }
}
```

**Lines Removed**: ~550 lines
**Lines Kept**: ~150 lines
**Reduction**: 78% smaller

## Testing Plan

### Unit Tests (After Each Step)

```bash
# After each modification:
npm run typecheck:node
```

### Integration Tests (After Step 8)

```bash
# Full build
npm run build

# Dev mode
npm run dev
```

### Manual Testing Checklist

**Basic Functionality**:
- [ ] App starts without errors
- [ ] Workspace selector appears (if no workspace)
- [ ] Main window opens
- [ ] Window controls work (minimize, maximize, close)

**IPC Communication**:
- [ ] Clipboard operations work
- [ ] File system operations work
- [ ] Dialog operations work
- [ ] Network status accessible
- [ ] Bluetooth info accessible
- [ ] Notifications work
- [ ] Cron jobs work
- [ ] Window manager works
- [ ] Store/settings persist
- [ ] Agent operations work
- [ ] RAG operations work

**Lifecycle**:
- [ ] App quits cleanly
- [ ] Services cleanup on quit
- [ ] No memory leaks
- [ ] Console shows cleanup logs

### Expected Console Output

**On Startup**:
```
[Main] Bootstrapping core infrastructure...
[Bootstrap] Initializing core infrastructure...
[Bootstrap] Registering services...
[Bootstrap] Registered all services
[Bootstrap] Registering IPC modules...
[IPC] Registered agent module (delegated to AgentService)
[IPC] Registered bluetooth module
[IPC] Registered clipboard module
[IPC] Registered cron module
[IPC] Registered custom module
[IPC] Registered dialog module
[IPC] Registered filesystem module
[IPC] Registered lifecycle module
[IPC] Registered media-permissions module
[IPC] Registered network module
[IPC] Registered notification module
[IPC] Registered rag module
[IPC] Registered store module
[IPC] Registered window module
[IPC] Registered workspace module
[Bootstrap] Registered 15 IPC modules
```

**On Quit**:
```
[AppState] App is quitting
[Bootstrap] Starting cleanup...
[ServiceContainer] Shutting down 4 services...
[Bootstrap] Cleanup complete
```

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| IPC handlers don't match | Low | High | Already verified 1:1 mapping |
| Service dependencies break | Medium | Medium | Container handles dependencies |
| Window methods fail | Low | Medium | No changes to window methods |
| Custom handlers missing | Medium | Low | Moved to CustomIpc module |
| Runtime errors | Low | High | Comprehensive testing plan |

### Rollback Procedures

**If Step 2-3 Fails**:
```bash
git checkout src/main/main.ts
npm run build
```

**If Step 5 Fails**:
```bash
git checkout src/main/index.ts
npm run build
```

**If Complete Rollback Needed**:
```bash
git reset --hard HEAD
git checkout backup-pre-phase4
npm run build
```

## Post-Migration Verification

### Success Criteria

- [ ] TypeScript compilation: 0 errors
- [ ] Production build: succeeds
- [ ] Dev mode: starts without errors
- [ ] All IPC handlers: working
- [ ] All services: accessible
- [ ] Window management: functional
- [ ] Cleanup: executes on quit
- [ ] Bundle size: <105 kB (acceptable)

### Performance Metrics

**Before**:
- Main class: 708 lines
- Constructor: 513 lines
- IPC handlers: 79 in one place

**After**:
- Main class: ~150 lines
- Constructor: ~10 lines
- IPC handlers: 0 (all in modules)

**Improvement**: 78% code reduction in Main class

## Timeline Estimate

| Step | Description | Time | Cumulative |
|------|-------------|------|------------|
| 0 | Pre-migration checklist | 15 min | 15 min |
| 1 | Backup and preparation | 15 min | 30 min |
| 2 | Update Main constructor | 30 min | 1h |
| 3 | Update service access | 20 min | 1h 20min |
| 4 | Analyze custom handlers | 15 min | 1h 35min |
| 5 | Update index.ts | 10 min | 1h 45min |
| 6 | Create CustomIpc | 15 min | 2h |
| 7 | Update properties | 10 min | 2h 10min |
| 8 | Final refactor | 20 min | 2h 30min |
| 9 | Testing | 30 min | 3h |

**Total**: 3 hours

## Dependencies and Prerequisites

**Required**:
- [x] Phase 1 complete (Core infrastructure)
- [x] Phase 2 complete (IPC modules)
- [x] Phase 3 complete (Integration)
- [ ] Backup created
- [ ] Test environment ready

**Optional but Recommended**:
- [ ] Code review scheduled
- [ ] Staging environment available
- [ ] Monitoring setup

## File Modifications Summary

### Files to Modify

1. **src/main/main.ts** - Major refactor (~550 lines removed)
2. **src/main/index.ts** - Enable IPC modules (~5 lines changed)
3. **src/main/ipc/CustomIpc.ts** - New file (~60 lines)
4. **src/main/ipc/index.ts** - Add CustomIpc export (~1 line)
5. **src/main/bootstrap.ts** - Register CustomIpc (~1 line)

### Backup Strategy

```bash
# Before starting
cp src/main/main.ts src/main/main.ts.backup
cp src/main/index.ts src/main/index.ts.backup

# After completion, if successful
rm src/main/main.ts.backup
rm src/main/index.ts.backup
```

## Communication Plan

### Team Notification

**Before Migration**:
- Announce start time
- Estimated duration: 3 hours
- Potential for issues

**During Migration**:
- Checkpoint updates at each step
- Immediate notification if blocked

**After Migration**:
- Success/failure report
- Performance metrics
- Next steps

## Success Metrics

### Quantitative

- [ ] Lines of code: <150 in Main class
- [ ] IPC handlers in Main: 0
- [ ] Build time: <15 seconds
- [ ] Bundle size: <105 kB
- [ ] Test coverage: 100% passing

### Qualitative

- [ ] Code readability: Improved
- [ ] Maintainability: Improved
- [ ] Debuggability: Improved
- [ ] Architecture: Clean separation of concerns

## Next Steps After Completion

1. **Update documentation**
2. **Create PR for review**
3. **Run extended testing**
4. **Deploy to staging**
5. **Monitor for issues**
6. **Plan Phase 5** (if needed)

## Emergency Contacts

- **Technical Lead**: [Your name]
- **Backup**: [Backup developer]
- **On-call**: [On-call engineer]

## Appendix A: Code Snippets

### Main.ts Final Constructor

```typescript
constructor(
  private lifecycleService: LifecycleService,
  private container: ServiceContainer
) {
  // Constructor is now minimal - services come from container
  // IPC handlers are in IPC modules
}
```

### Main.ts Service Getters

```typescript
private get storeService(): StoreService {
  return this.container.get<StoreService>('store')
}

private get windowFactory(): WindowFactory {
  return this.container.get<WindowFactory>('windowFactory')
}
```

### Bootstrap.ts CustomIpc Registration

```typescript
const ipcModules: IpcModule[] = [
  new AgentIpc(),
  // ... other modules
  new CustomIpc(),  // Add this
  new WorkspaceIpc()
]
```

## Appendix B: Verification Commands

```bash
# TypeScript check
npm run typecheck

# Build
npm run build

# Dev mode
npm run dev

# Count lines in Main class
wc -l src/main/main.ts

# Count IPC handlers in Main class
grep -c "ipcMain" src/main/main.ts

# Verify IPC modules registered
grep "Registered.*module" out/main/index.js
```

---

**Ready to Execute**: This plan is ready to implement. All prerequisites are met and all IPC modules are prepared.

**Recommendation**: Block 3 hours of focused time and execute all steps sequentially.
