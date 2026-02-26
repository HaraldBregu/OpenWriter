# Workspace Architect Memory

## Architecture Overview
- **Multi-process model**: Launcher process + per-workspace child Electron processes (`WorkspaceProcessManager`)
- **Window-scoped services**: Each `BrowserWindow` gets its own `WindowContext` with isolated workspace services
- **Service factory pattern**: `WindowScopedServiceFactory` in `src/main/core/WindowScopedServiceFactory.ts` registers per-window services

## Key Files
- `src/shared/types/ipc/channels.ts` - All IPC channel constants and type maps
- `src/shared/types/ipc/types.ts` - Shared data interfaces (~50 types)
- `src/main/services/workspace.ts` - WorkspaceService (path management, validation, EventBus integration)
- `src/main/services/workspace-metadata.ts` - WorkspaceMetadataService (workspace.tsrct file, directories)
- `src/main/workspace-process.ts` - WorkspaceProcessManager (multi-process spawning)
- `src/main/ipc/WorkspaceIpc.ts` - IPC handlers for workspace operations
- `src/main/core/WindowContext.ts` - Per-window service isolation
- `src/main/core/WindowScopedServiceFactory.ts` - Factory for window-scoped services
- `src/main/services/file-watcher.ts` - FileWatcherService (posts directory, chokidar)
- `src/main/services/documents-watcher.ts` - DocumentsWatcherService (documents directory, chokidar)

## Workspace Data Flow
1. Renderer calls `window.workspace.selectFolder()` -> IPC -> native dialog
2. Renderer calls `window.workspace.setCurrent(path)` -> WorkspaceService validates + persists
3. WorkspaceService emits `workspace:changed` on EventBus
4. All watchers (FileWatcher, DocumentsWatcher, PersonalityFiles, OutputFiles) react to workspace change
5. Metadata stored in `workspace.tsrct` JSON file in workspace root

## Window-Scoped Services (per BrowserWindow)
- `workspace` - WorkspaceService
- `workspaceMetadata` - WorkspaceMetadataService
- `fileWatcher` - FileWatcherService (posts)
- `documentsWatcher` - DocumentsWatcherService
- `personalityFiles` - PersonalityFilesService
- `outputFiles` - OutputFilesService

## Watcher Pattern
- All watchers use chokidar with polling (`usePolling: true`)
- Each watcher monitors one subdirectory (posts/, documents/, etc.)
- Debounce timers prevent rapid-fire events
- `markFileAsWritten()` prevents feedback loops from app-generated writes
- Watchers listen to `workspace:changed` EventBus events to start/stop

## IPC Pattern
- `IpcGateway.ts` provides `registerQuery`, `registerCommand`, `registerCommandWithEvent`
- `wrapSimpleHandler` / `wrapIpcHandler` in IpcErrorHandler for error wrapping
- Preload uses `typedInvokeUnwrap` for type-safe renderer->main calls
- EventBus `broadcast()` pushes events from main->renderer via `webContents.send`

## WorkspaceInfo Type
```typescript
interface WorkspaceInfo { path: string; lastOpened: number }
```
Minimal - only path and timestamp. No name, description, or rich metadata.
