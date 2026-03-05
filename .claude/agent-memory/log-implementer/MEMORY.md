# Logging Replacement Task

## Current Status
Replacing all `console.*` calls in `src/main/**/*.ts` with existing `LoggerService`.

## LoggerService API
- Location: `src/main/services/logger.ts`
- Signature: `logger.debug|info|warn|error(source: string, message: string, data?: unknown)`
- Already registered in ServiceContainer as 'logger'
- Already passed to: AgentTaskHandler, WorkspaceProcessManager, index.ts, bootstrap.ts

## Files Processed
1. **bootstrap.ts** - DONE: Replaced 5 console.log/error calls with logger
2. **index.ts** - DONE: Replaced 3 console.log calls with logger
3. **main.ts** - DONE: Removed 3 non-critical console.log statements

## Files to Process
- **services/documents-watcher.ts** - 20+ console calls (needs logger parameter)
- **services/output-files.ts** - 60+ console calls (needs logger parameter)
- **services/store.ts** - 2 console calls
- **services/workspace.ts** - 8+ console calls
- **services/workspace-metadata.ts** - 40+ console calls
- **taskManager/TaskExecutor.ts** - 12+ console calls
- **taskManager/TaskReactionBus.ts** - 2+ console calls
- **ipc/*.ts** - Various modules with console calls (AppIpc, TaskManagerIpc, WindowIpc, WorkspaceIpc)
- **core/**: EventBus, Observable, ServiceContainer, WindowContext, WindowFactory, WindowScopedServiceFactory
- **taskManager/reactions/DemoTaskReaction.ts** - Demo code with console calls
- **logger.ts** - 3 console.error calls (internal to logger, acceptable)

## Strategy
- For services: Add optional `logger?: LoggerService` parameter to constructor
- For IPC modules: Add logger from container.get('logger')
- For core classes without bootstrap access: Remove non-critical logs or add logger parameter
- Use source = class name or filename (e.g., 'DocumentsWatcherService')
- Keep changes simple - just replace console.* with logger.* calls, no complex abstractions

## Notes
- AgentExecutor already has conditional logger usage with console fallback - leave as-is
- LoggerService itself uses console for internal errors and output - acceptable pattern
- Some files (like DemoTaskReaction) are demo code - can remove or keep console calls
