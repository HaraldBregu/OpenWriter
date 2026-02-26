# Workspace Architect Memory

## Architecture Overview
- **Multi-process model**: Launcher process + per-workspace child Electron processes (`WorkspaceProcessManager`)
- **Window-scoped services**: Each `BrowserWindow` gets its own `WindowContext` with isolated workspace services
- **Service factory pattern**: `WindowScopedServiceFactory` in `src/main/core/WindowScopedServiceFactory.ts` registers per-window services

## Key Files
- `src/shared/types/ipc/channels.ts` - All IPC channel constants and type maps
- `src/shared/types/ipc/types.ts` - Shared data interfaces (~50 types)
- `src/main/services/workspace.ts` - WorkspaceService (path management, validation, EventBus, deletion detection)
- `src/main/services/workspace-metadata.ts` - WorkspaceMetadataService (workspace.tsrct file, directories)
- `src/main/ipc/WorkspaceIpc.ts` - IPC handlers for workspace operations
- `src/main/core/WindowContext.ts` - Per-window service isolation
- `src/main/services/documents-watcher.ts` - DocumentsWatcherService (documents directory, chokidar)

## Workspace Data Flow
1. Renderer calls `window.workspace.selectFolder()` -> IPC -> native dialog
2. Renderer calls `window.workspace.setCurrent(path)` -> WorkspaceService validates + persists
3. WorkspaceService emits `workspace:changed` on EventBus
4. All watchers (DocumentsWatcher, PersonalityFiles, OutputFiles) react to workspace change
5. Metadata stored in `workspace.tsrct` JSON file in workspace root

## Workspace Deletion Detection (implemented)
- WorkspaceService runs 5s interval timer checking `fs.statSync` on workspace path
- Timer starts on `initialize()` and `setCurrent()`, stops on `clear()` and `destroy()`
- On detection: calls `clear()`, emits `workspace:deleted` via EventBus + broadcast
- Reason heuristic: parent dir missing -> `inaccessible`, else -> `deleted`
- Renderer: `useWorkspaceValidation` hook subscribes to `workspace:deleted` IPC event
- Redux: `handleWorkspaceDeleted` sets `deletionReason`, `clearDeletionReason` resets
- WelcomePage shows dismissible banner when `deletionReason` is set

## IPC Pattern
- `wrapSimpleHandler` / `wrapIpcHandler` in IpcErrorHandler for error wrapping
- Preload uses `typedInvokeUnwrap` for type-safe renderer->main calls
- EventBus `broadcast()` pushes events from main->renderer via `webContents.send`
- Event channels: add to `EventChannelMap` in channels.ts, wire in preload with `typedOn`

## i18n
- Translation files: `resources/i18n/{en,it}/main.json`
- Setup: `src/renderer/src/i18n.ts` (i18next + react-i18next)

## Testing
- Tests live in `tests/unit/{main,renderer}/` mirroring src structure
- Jest with fake timers for interval-based tests
- Mock `node:fs` at top with `jest.mock('node:fs')`
- EventBus mocked as plain object with jest.fn() methods
