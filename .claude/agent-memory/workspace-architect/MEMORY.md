# Workspace Architect Memory

## Architecture Overview
- **Window-scoped services**: Each `BrowserWindow` gets its own `WindowContext` with isolated workspace services
- **Service factory pattern**: `WindowScopedServiceFactory` in `src/main/core/window-scoped-service-factory.ts`

## Key Files (verified current locations)
- `src/shared/channels.ts` - All IPC channel constants and type maps
- `src/shared/types.ts` - Shared data interfaces
- `src/main/workspace/workspace-service.ts` - WorkspaceService (path management, validation, deletion detection)
- `src/main/workspace/workspace-metadata.ts` - WorkspaceMetadataService (workspace.tsrct file, directories)
- `src/main/workspace/workspace.ts` - Workspace facade over all workspace services
- `src/main/workspace/project-workspace.ts` - ProjectWorkspaceService (project_workspace.json)
- `src/main/ipc/workspace-ipc.ts` - IPC handlers for workspace operations
- `src/main/core/window-context.ts` - Per-window service isolation
- `src/preload/index.ts` - Preload bridge (exposes window.workspace API)
- `src/preload/index.d.ts` - Type declarations for preload API

## IPC Pattern
- `wrapSimpleHandler` / `wrapIpcHandler` in `src/main/ipc/ipc-error-handler.ts`
- Preload uses `typedInvokeUnwrap` for type-safe renderer->main calls
- EventBus `broadcast()` pushes events from main->renderer via `webContents.send`
- Channels defined in `WorkspaceChannels` constant object in `src/shared/channels.ts`

## Testing
- Tests live in `tests/unit/main/services/` with filenames matching source
- Many pre-existing test failures from missing modules (bluetooth, dialog, agent, etc.)
- Workspace tests all pass: WorkspaceService, workspace-metadata, project-workspace

## Project Workspace Feature (implemented)
- [project-workspace.md](project-workspace.md) - Feature details
