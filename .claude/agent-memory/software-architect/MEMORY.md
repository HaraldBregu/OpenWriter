# Software Architect Memory

## Project Architecture Patterns

### Service Registration Pattern
- **Global services**: registered in `src/main/bootstrap.ts` via `container.register()`
- **Window-scoped services**: registered in `src/main/core/WindowContext.ts` inside `initializeServices()`
- Each window gets isolated instances of workspace-related services
- Service key naming: camelCase (e.g., `'personalityFiles'`, `'outputFiles'`, `'workspace'`)

### IPC Module Pattern
- IPC modules implement `IpcModule` interface from `src/main/ipc/IpcModule.ts`
- Registered in `bootstrapIpcModules()` in `src/main/bootstrap.ts`
- Exported from barrel file at `src/main/ipc/index.ts`
- Use `wrapIpcHandler` from `IpcErrorHandler.ts` for standardized error handling
- Use `getWindowService<T>()` from `IpcHelpers.ts` to access window-scoped services
- IPC results wrapped as `{ success: true, data: T } | { success: false, error: {...} }`

### File Storage Pattern (Folder-Based)
- Used by PersonalityFilesService and OutputFilesService
- Structure: `<workspace>/<domain>/<type-or-section>/<YYYY-MM-DD_HHmmss>/config.json + DATA.md`
- Date folder format: `formatDateFolderName()` produces `YYYY-MM-DD_HHmmss`
- File watcher: chokidar with `usePolling: true`, `depth: 2`, debounced events
- Ignored writes pattern: `markFileAsWritten()` + setTimeout cleanup to prevent infinite loops
- EventBus used for broadcasting file change events to renderer

### TypeScript Config
- `tsconfig.node.json` = main process
- `tsconfig.web.json` = renderer process
- Pre-existing TS4023 "cannot be named" errors in web config (declaration emit, non-blocking)

## Key File Locations
- Services: `src/main/services/`
- IPC modules: `src/main/ipc/`
- Window context: `src/main/core/WindowContext.ts`
- Bootstrap: `src/main/bootstrap.ts`
- Redux store: `src/renderer/src/store/`

## Output Files System (Created 2026-02-23)
- Service: `src/main/services/output-files.ts` (OutputFilesService)
- IPC: `src/main/ipc/OutputIpc.ts` (OutputIpc)
- Redux: `src/renderer/src/store/outputSlice.ts`
- Types: posts | writings | notes | messages
- Service key: `'outputFiles'` in WindowContext
- Follows same pattern as PersonalityFilesService exactly
