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
- Preload: `src/preload/index.ts` — individual `contextBridge.exposeInMainWorld` calls per namespace
- Preload types: `src/preload/index.d.ts` — matching Window interface with per-namespace declarations

## Preload Namespace Map (post-split)
- `window.electron` — ElectronAPI (unchanged)
- `window.app` — playSound, setTheme, showContextMenu, showContextMenuEditable, onLanguageChange, onThemeChange, onFileOpened, popupMenu, getPlatform
- `window.win` — minimize, maximize, close, isMaximized, isFullScreen, onMaximizeChange, onFullScreenChange
- `window.media` — requestMicrophonePermission, requestCameraPermission, getMicrophonePermissionStatus, getCameraPermissionStatus, getDevices
- `window.bluetooth` — isSupported, getPermissionStatus, getInfo
- `window.network` — isSupported, getConnectionStatus, getInterfaces, getInfo, onStatusChange
- `window.cron` — getAll, getJob, start, stop, delete, create, updateSchedule, validateExpression, onJobResult
- `window.lifecycle` — getState, getEvents, restart, onEvent
- `window.wm` — getState, createChild, createModal, createFrameless, createWidget, closeWindow, closeAll, onStateChange
- `window.fs` — openFile, readFile, saveFile, writeFile, selectDirectory, watchDirectory, unwatchDirectory, getWatched, onWatchEvent
- `window.dialog` — open, openDirectory, save, message, error
- `window.notification` — isSupported, show, onEvent
- `window.clipboard` — writeText, readText, writeHTML, readHTML, writeImage, readImage, clear, getContent, getFormats, hasText, hasImage, hasHTML
- `window.store` — getAllModelSettings, getModelSettings, setSelectedModel, setApiToken, setModelSettings
- `window.workspace` — selectFolder, getCurrent, setCurrent, getRecent, clear, directoryExists, removeRecent
- `window.posts` — syncToWorkspace, update, delete, loadFromWorkspace, onFileChange, onWatcherError
- `window.documents` — importFiles, importByPaths, downloadFromUrl, loadAll, delete, onFileChange, onWatcherError
- `window.agent` — run, cancel, onEvent, createSession, destroySession, getSession, listSessions, clearSessions, runSession, cancelSession, getStatus, isRunning
- `window.contextMenu` — showWriting, onWritingAction, showPost, onPostAction
- `window.directories` — list, add, addMany, remove, validate, markIndexed, onChanged
- `window.personality` — save, loadAll, loadOne, delete, onFileChange, onWatcherError, loadSectionConfig, saveSectionConfig, onSectionConfigChange
- `window.output` — save(blocks[]), loadAll, loadByType, loadOne, update(blocks[]), delete, onFileChange, onWatcherError
- `window.task` — submit, cancel, list, onEvent (unchanged)
- `window.ai` — inference, cancel, onEvent, listAgents, listRuns (unchanged)
- IPC channel names are UNCHANGED — only JS-side bridge property names were renamed

## Personality System
- Conversations: `<workspace>/personality/<section>/<YYYY-MM-DD_HHmmss>/config.json + DATA.md`
- Section config: `<workspace>/personality/<section>/config.json` (flat, not inside a date folder)
- Watcher depth=2 covers: personality/ → section/ → date-folder/
  - Depth 2 items (section/): date folders, .md files, AND section-level config.json
  - Depth 3 items (date-folder/): config.json and DATA.md only
- Section config change events: `personality:section-config-changed` — payload `{ sectionId, config, timestamp }`
- 3-layer fallback for new conversation metadata: caller input → section config → APP_DEFAULTS

## Output System (per-block .md format)
- New format: `<workspace>/output/<type>/<YYYY-MM-DD_HHmmss>/config.json + <uuid>.md` per block
- `config.json` has a `content: ContentBlockDescriptor[]` array (ordered, each maps to a .md file)
- Legacy `DATA.md` format is auto-migrated on first `loadFolder()` call (no manual step needed)
- `OutputFilesService.save()` requires `blocks: [{name, content}]` — NOT flat `content: string`
- `OutputFilesService.update()` requires `blocks` array — diffs against existing to delete removed blocks
- Watcher depth=3 (was 2) to cover: output/ → type/ → date-folder/ → block.md
- `BLOCK_FILE_RE = /^[0-9a-f-]+\.md$/i` used to identify block files in watcher `ignored` predicate
- Both config changes and block .md changes emit same `output:file-changed` event with the date-folder as `fileId`
- `window.posts` (PostsIpc) remains unchanged — uses separate `<workspace>/posts/{id}.json` flat format

## Details Files
- See `patterns.md` for extended code patterns
