# OpenWriter — Architectural Patterns

## Store: workspace slice

- Location: `src/renderer/src/store/workspace/`
- Structure: `state.ts`, `actions.ts` (async thunks), `reducer.ts` (slice + sync actions),
  `selectors.ts`, `listeners.ts` (RTK listener middleware effects), `index.ts` (barrel).
- Async thunks live in `actions.ts`. Sync actions are defined in the `createSlice` reducers
  object inside `reducer.ts` and re-exported from `index.ts`.
- Side-effect listeners use RTK `startAppListening` (from `store/listener-middleware.ts`),
  NOT sagas.

## IPC → Redux bridge (App.tsx)

- Module-level `if (!initialized)` guards register IPC push listeners once on startup.
- `window.workspace.onDocumentFileChange` drives resource list updates in the renderer.
- **Important**: This bridge does NOT fire for app-initiated file copies because
  `DocumentsService` calls `watcher.markFileAsWritten()` before each copy, causing
  `DocumentsWatcherService` to suppress the resulting chokidar events.
- Consequence: any feature that imports files via `window.workspace.importFiles` must
  call `loadResources()` directly — it cannot rely on the watcher bridge.

## DocumentsWatcherService (main process)

- File: `src/main/workspace/documents-watcher.ts`
- Uses chokidar with `usePolling: true`, 500 ms interval, `ignoreWriteWindowMs: 2000`.
- `markFileAsWritten(path)` adds the path to `ignoredWrites` for 2 s; any chokidar
  event for that path within the window is dropped silently.
- Events are debounced 300 ms and broadcast via `eventBus.broadcast('resources:file-changed')`.

## Resource reload pattern

- Correct approach after any app-driven write to the resources folder:
  dispatch `loadResources()` from `store/workspace/actions.ts` directly.
- `removeResources` thunk already does this correctly (calls `loadDocuments()` inline).
- `importResourcesRequested` listener was missing this — fixed in listeners.ts.
