# Electron Expert Agent Memory

## Key Architectural Patterns

### IPC Pattern
- All IPC handlers use `wrapIpcHandler` from `src/main/ipc/IpcErrorHandler.ts`
- Window-scoped services accessed via `getWindowService<T>(event, container, 'serviceKey')`
- Preload unwraps `IpcResult<T>` via `unwrapIpcResult(ipcRenderer.invoke(...))`
- Channel naming: `domain:action` (e.g., `personality:save-section-config`)

### File Watcher Pattern (chokidar)
- Use `markFileAsWritten(filePath)` before every `fs.writeFile` to suppress self-triggered events
- Use `ensureDirectory(dirPath)` before writing to paths that may not exist yet
- Watcher `ignored` predicate filters by relative path depth (parts.length from personality root)
- Broadcast-only watcher events: file events go to renderer via `eventBus.broadcast(channel, payload)`

### Service Initialization
- Services implement `Disposable` interface (destroy method required)
- Subscribe to `workspace:changed` via `eventBus.on()` to restart watchers on workspace switch

## Key File Locations
- Main services: `src/main/services/`
- IPC modules: `src/main/ipc/` — each domain has its own `*Ipc.ts` class
- EventBus: `src/main/core/EventBus.ts` — `broadcast()` sends to all windows
- Preload: `src/preload/index.ts` — single file, `api` object exposed via contextBridge

## Personality System
- Conversations: `<workspace>/personality/<section>/<YYYY-MM-DD_HHmmss>/config.json + DATA.md`
- Section config: `<workspace>/personality/<section>/config.json` (flat, not inside a date folder)
- Watcher depth=2 covers: personality/ → section/ → date-folder/
  - Depth 2 items (section/): date folders, .md files, AND section-level config.json
  - Depth 3 items (date-folder/): config.json and DATA.md only
- Section config change events: `personality:section-config-changed` — payload `{ sectionId, config, timestamp }`
- 3-layer fallback for new conversation metadata: caller input → section config → APP_DEFAULTS

## Details Files
- See `patterns.md` for extended code patterns
