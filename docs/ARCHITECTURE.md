# Architecture Overview

OpenWriter is split into four runtime layers:

1. `renderer` for React UI
2. `preload` for the typed browser-safe bridge
3. `shared` for IPC contracts and DTOs
4. `main` for privileged Electron, filesystem, task, and AI orchestration

The current `main` and `preload` architecture is shown below.

```mermaid
flowchart TB
	Renderer[Renderer<br/>React UI]

	subgraph Preload[Preload API<br/>src/preload/index.ts]
		AppApi[window.app]
		WinApi[window.win]
		WorkspaceApi[window.workspace]
		TaskApi[window.task]
		TypedIPC[typedInvoke / typedInvokeUnwrap / typedInvokeRaw / typedSend / typedOn]

		AppApi --> TypedIPC
		WinApi --> TypedIPC
		WorkspaceApi --> TypedIPC
		TaskApi --> TypedIPC
	end

	Shared[Shared IPC contracts<br/>src/shared/channels.ts]

	subgraph Main[Main Process]
		Bootstrap[bootstrapServices()<br/>bootstrapIpcModules()]
		IpcModules[IPC modules<br/>AppIpc | WindowIpc | WorkspaceIpc | TaskManagerIpc]
		GlobalServices[Global services<br/>StoreService | FileManager | LoggerService | WindowFactory | WindowContextManager | AgentRegistry | ProviderResolver | TaskExecutor | ExtractorRegistry]

		subgraph WindowScope[Per-window services<br/>created by WindowContextManager]
			WorkspaceService[WorkspaceService]
			WorkspaceMetadata[WorkspaceMetadataService]
			DocumentsWatcher[DocumentsWatcherService]
			OutputFiles[OutputFilesService]
			ProjectWorkspace[ProjectWorkspaceService]
			WorkspaceFacade[Workspace facade<br/>workspaceManager]

			WorkspaceService --> WorkspaceMetadata
			WorkspaceService --> DocumentsWatcher
			WorkspaceService --> OutputFiles
			WorkspaceService --> ProjectWorkspace
			WorkspaceService --> WorkspaceFacade
			WorkspaceMetadata --> WorkspaceFacade
			DocumentsWatcher --> WorkspaceFacade
			OutputFiles --> WorkspaceFacade
			ProjectWorkspace --> WorkspaceFacade
		end

		TaskHandlers[Task handlers<br/>AgentTaskHandler | IndexResourcesTaskHandler]
		AI[AI and indexing<br/>agent graphs | embeddings | vector store]

		Bootstrap --> IpcModules
		Bootstrap --> GlobalServices
		GlobalServices --> WindowScope
		GlobalServices --> TaskHandlers
		TaskHandlers --> AI
	end

	Renderer --> Preload
	TypedIPC --> Shared
	Shared --> IpcModules
```

## Preload To Main Mapping

| Preload namespace  | Main IPC module  | Backing runtime                                                        |
| ------------------ | ---------------- | ---------------------------------------------------------------------- |
| `window.app`       | `AppIpc`         | Electron menus/theme/sound plus `StoreService` provider settings       |
| `window.win`       | `WindowIpc`      | `BrowserWindow` state and application menu access                      |
| `window.workspace` | `WorkspaceIpc`   | Per-window `workspaceManager` facade and Electron dialog/shell helpers |
| `window.task`      | `TaskManagerIpc` | Global `TaskExecutor`, `TaskHandlerRegistry`, and task events          |

## Ownership And Dependencies

### Preload

`src/preload/index.ts` is a transport layer only.

- it exposes `window.app`, `window.win`, `window.workspace`, and `window.task`
- it does not implement business logic
- it delegates all IPC transport through `src/preload/typed-ipc.ts`
- all channel names and payload types come from `src/shared/channels.ts`

### Main Global Layer

`src/main/bootstrap.ts` builds the global runtime.

It registers:

- core infrastructure: `ServiceContainer`, `EventBus`, `AppState`, `WindowFactory`, `WindowContextManager`
- shared services: `StoreService`, `FileManager`, `LoggerService`
- AI/task services: `AgentRegistry`, `ProviderResolver`, `TaskExecutor`, `ExtractorRegistry`
- IPC modules: `AppIpc`, `WorkspaceIpc`, `TaskManagerIpc`, `WindowIpc`

### Main Window-Scoped Layer

Each `BrowserWindow` gets its own `WindowContext`.

That context creates isolated instances of:

- `WorkspaceService`
- `WorkspaceMetadataService`
- `DocumentsWatcherService`
- `OutputFilesService`
- `ProjectWorkspaceService`
- `Workspace` facade registered as `workspaceManager`

This is the key architectural point the screenshot missed: workspace state is per-window, not one shared global singleton for every window.

## Data Flow

### App And Window Flow

```text
Renderer
  -> window.app / window.win
  -> preload typed IPC
  -> AppIpc / WindowIpc
  -> Electron APIs and StoreService
```

### Workspace Flow

```text
Renderer
  -> window.workspace
  -> preload typed IPC
  -> WorkspaceIpc
  -> window-scoped workspaceManager
  -> WorkspaceService / metadata / watchers / output files / project workspace
  -> EventBus broadcast
  -> preload event subscription
  -> renderer updates UI state
```

### Task And AI Flow

```text
Renderer
  -> window.task.submit(...)
  -> TaskManagerIpc
  -> TaskExecutor
  -> TaskHandlerRegistry
  -> AgentTaskHandler or IndexResourcesTaskHandler
  -> AI agents / indexing pipeline
  -> TaskExecutor emits task:event through EventBus
  -> preload onEvent subscription
  -> renderer task store
```

## Related Files

- [src/preload/index.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\preload\index.ts)
- [src/preload/typed-ipc.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\preload\typed-ipc.ts)
- [src/shared/channels.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\shared\channels.ts)
- [src/main/bootstrap.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\bootstrap.ts)
- [src/main/core/window-context.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\core\window-context.ts)
- [src/main/core/window-scoped-service-factory.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\core\window-scoped-service-factory.ts)
- [src/main/ipc/workspace-ipc.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\ipc\workspace-ipc.ts)
- [src/main/ipc/task-manager-ipc.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\ipc\task-manager-ipc.ts)
- [src/main/ipc/app-ipc.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\ipc\app-ipc.ts)
- [src/main/ipc/window-ipc.ts](C:\Users\BRGHLD87H\Documents\OpenWriter\src\main\ipc\window-ipc.ts)

## Related Docs

- [TASK_MANAGER.md](./TASK_MANAGER.md)
- [TASK_MANAGER_AI_HANDLERS.md](./TASK_MANAGER_AI_HANDLERS.md)
- [WORKSPACE_STATE_MANAGEMENT_PHASE1.md](./WORKSPACE_STATE_MANAGEMENT_PHASE1.md)
