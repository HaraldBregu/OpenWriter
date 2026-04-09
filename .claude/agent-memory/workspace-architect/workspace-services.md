---
name: Workspace Service Architecture
description: Window-scoped services, Workspace facade, watcher patterns, and service factory
type: project
---

**Window-scoped services** are created per BrowserWindow via `WindowScopedServiceFactory` in `src/main/core/window-scoped-service-factory.ts`. Each window gets isolated instances of workspace-related services.

**Service creation order matters** -- services are created sequentially so later services can depend on earlier ones. The factory context provides `windowContainer` for resolving previously registered services.

**Key services per window:**
1. `workspace` (WorkspaceService) -- created directly in WindowContext before factory runs
2. `workspaceMetadata` (WorkspaceMetadataService)
3. `documentsWatcher` (DocumentsWatcherService) -- watches resources/ folder
4. `filesWatcher` (FilesWatcherService) -- watches resources/files/ sub-folder
5. `filesService` (FilesService) -- CRUD for resources/files/
6. `outputFiles` (OutputFilesService) -- output document management
7. `projectWorkspace` (ProjectWorkspaceService) -- project_workspace.openwriter file
8. `workspaceManager` (Workspace) -- facade over all above services

**Watcher pattern:** Uses chokidar with debouncing, ignored writes tracking, and EventBus broadcasting. `markFileAsWritten()` prevents feedback loops when app writes files.

**EventBus** (`src/main/core/event-bus.ts`) has both `broadcast()` (main-to-all-renderers via webContents.send) and `emit()`/`on()` (typed main-process events). Watcher events must be added to `AppEvents` interface for `emit()` type safety.

**Why:** Window isolation prevents workspace state leaking between windows.

**How to apply:** Register new window-scoped services in `createDefaultWindowScopedServiceFactory()`. Add new event types to AppEvents in event-bus.ts.
