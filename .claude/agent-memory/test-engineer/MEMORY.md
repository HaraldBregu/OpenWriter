# Test Engineer Memory — OpenWriter

## Project Setup
- **Test command**: `npm test` (uses `npx jest --config jest.config.cjs`)
- **Run single file**: `npx jest --config jest.config.cjs --testPathPatterns=<filename>`
- **Capture test output**: jest writes to STDERR — use `2>/tmp/out.txt; cat /tmp/out.txt`
- **Jest**: v30, **React**: v19, **RTL**: v16, **jsdom** environment for renderer tests
- **Coverage thresholds**: 50% minimum (branches/functions/lines/statements)
- **Multi-project setup**: "main" (node env) + "renderer" (jsdom env)
- **Path aliases**: `@/` → src/renderer/src/, `@store/` → src/renderer/src/store/, etc.

## Critical: import.meta.env in Main-Process Tests

Main-process files using `import.meta.env.VITE_*` require this shim (before imports):

```typescript
const metaEnv: Record<string, string | undefined> = { VITE_OPENAI_API_KEY: undefined, VITE_OPENAI_MODEL: undefined }
Object.defineProperty(global, 'import', { value: { meta: { env: metaEnv } }, writable: true, configurable: true })
```

Mutate `metaEnv` values in `beforeEach` to control what the module reads.
Confirmed pattern from `tests/unit/main/tasks/handlers/AIChatHandler.test.ts`.
Do NOT use `globalThis.__importMetaEnv` — does not work.

## LangChain Mock Pattern (ChatOpenAI agents)

- Mock `@langchain/openai` and `@langchain/core/messages` BEFORE importing the agent
- `const stream = await model.stream(...)` is always awaited → use `mockStream.mockResolvedValue()`
  NOT `mockReturnValue()`
- Inspect `ChatOpenAI` constructor args with `(ChatOpenAI as jest.Mock).mock.calls[0][0]`

## AbortError in Node.js Tests

`classifyError` checks `name.toLowerCase() === 'aborterror'`. Use:
```typescript
const err = new Error('AbortError'); err.name = 'AbortError'
```
Do NOT use `new DOMException(...)` — its `name` property does not match reliably in Node.

## Critical: React 19 + RTL 16 Test Isolation

React 19 has more aggressive async state batching. When testing hooks with `renderHook`:

**Problem**: Async state updates (`setStatus`, `setResponse`) scheduled inside event handlers or
promise callbacks in one test can fire inside the next test's `act()` wrapper, causing
`result.current` to become null (the component appears unmounted).

**Symptoms**:
- Tests pass in isolation (`--testNamePattern`) but fail when run together
- Error: `TypeError: Cannot read properties of null (reading 'X')`
- Stack trace line numbers point to code in a DIFFERENT test than the one reported as failing

**Root cause**: React 19's `act()` captures ALL async state updates that happen while it's
active. Pending state updates from the previous test's act() can fire inside the current test.

**Solution**: Split tests into SEPARATE `describe` blocks, each with its own `afterEach` that
resets shared state. This prevents React's async scheduler from crossing test boundaries.

```typescript
// DO THIS — separate describe blocks for logical groups
describe('useFoo — run()', () => {
  afterEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
  })
  it(...)
})

describe('useFoo — cancel()', () => {
  afterEach(() => { /* same reset */ })
  it(...)
})

// NOT THIS — single describe with many tests that emit terminal events
describe('useFoo', () => {
  it('finish with done...') // leaves 'done' state
  it('cancel...') // sees null result.current from previous test's pending updates
})
```

**Additional guards for tests with unresolved promises**:
- Always call `unmount()` explicitly in tests that use `new Promise(() => {})` (never-resolves)
- Always call `unmount()` in tests that emit `done`/`error` events

## window.ai Mock Pattern

The hook `usePipeline` uses `window.ai.inference/cancel/onEvent` (NOT `window.api`).

```typescript
function createAiMock(inferenceImpl?: jest.Mock) {
  const listeners: AiEventListener[] = []
  const mockAi = {
    inference: inferenceImpl ?? jest.fn().mockResolvedValue({ success: true, data: { runId: 'test-run-id' } }),
    cancel: jest.fn(),
    onEvent: jest.fn().mockImplementation((cb) => {
      listeners.push(cb)
      return () => { const idx = listeners.indexOf(cb); if (idx > -1) listeners.splice(idx, 1) }
    }),
  }
  Object.defineProperty(window, 'ai', { value: mockAi, writable: true, configurable: true })
  return { mockAi, listeners }
}
// Always reset in afterEach:
Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
```

## IPC / Service Mocking Patterns

### WindowContextManager chain
`getWindowService()` uses: `windowContextManager.get(windowId) → WindowContext → getService(key)`
```typescript
const mockWindowContext = { getService: jest.fn().mockReturnValue(mockService) }
const mockWindowContextManager = { get: jest.fn().mockReturnValue(mockWindowContext) }
container.register('windowContextManager', mockWindowContextManager)
```

### window.api mock (preload bridge)
Located at `tests/mocks/preload-bridge.ts`. Installed globally via `renderer.ts` setup.
Reset with `resetMockApi()` in `beforeEach` (done automatically by renderer.ts setup).

## Key Module Renames (brain → personality)
- `src/main/services/brain-files` → `src/main/services/personality-files` → `PersonalityFilesService`
- `src/renderer/src/store/brainFilesSlice` → `personalityFilesSlice`
- `src/renderer/src/hooks/useBrainFiles` → `usePersonalityFiles`
- Personality sections (10): emotional-depth, consciousness, motivation, moral-intuition,
  irrationality, growth, social-identity, creativity, mortality, contradiction

## PersonalityFilesService API
- Constructor: `new PersonalityFilesService(workspaceService, eventBus)`
- `save({ sectionId, content, metadata })` → writes config.json + DATA.md in `YYYY-MM-DD_HHmmss/` folder
- `loadAll()` → uses `fs.access` (NOT `fs.stat`) for directory existence check
- `loadOne(sectionId, fileId)` → TWO separate args, not an object
- `delete(sectionId, fileId)` → TWO separate args; uses `fs.rm({ recursive: true })`
- `readdir` called with `{ withFileTypes: true }` — mock with `makeDirent(name, isDir)` objects

## WorkspaceIpc
- Has 7 handlers (not 6): includes `workspace-remove-recent`
- Window-scoped handlers use `getWindowService()` pattern with `windowContextManager`

## Test File Locations
- Main process tests: `tests/unit/main/`
- Renderer tests: `tests/unit/renderer/`
- Integration tests: `tests/integration/`
- Mocks: `tests/mocks/`
- Setup: `tests/setup/renderer.ts` (installed globally for renderer tests)

## Redux Slice Testing Conventions

**Canonical pattern**: `chatSlice.test.ts` (read this first before writing any slice test).

**State helper**: `createInitialState()` function mirrors slice's `initialState` exactly.

**Selector root state**: Construct an object shaped like the Redux root — e.g.
`{ directories: createInitialState() }` for directoriesSlice. For slices that use `RootState`
(e.g. outputSlice — `state.output.*`), cast via `as unknown as Parameters<typeof selector>[0]`.

**Async thunk extra-reducers**: Test pending/fulfilled/rejected using inline action objects:
```typescript
function pending(thunk) { return { type: thunk.pending.type } }
function fulfilled(thunk, payload) { return { type: thunk.fulfilled.type, payload } }
function rejected(thunk, payload) { return { type: thunk.rejected.type, payload, error: {} } }
```

**addMatcher (cross-slice) testing**: Pass the triggering action type as a plain object:
```typescript
// writingsSlice listens to 'output/loadAll/fulfilled'
writingsReducer(state, { type: 'output/loadAll/fulfilled', payload: items })
```

**`import type` in slice source**: When a slice uses `import type { X }` from a heavy module
(e.g. Block from ContentBlock.tsx), that import is erased at runtime — Jest will NOT load
the module. Tests import the slice directly with no extra mocking needed.

**Slices with tests as of 2026-02-25**:
`chatSlice`, `postsSlice`, `brainFilesSlice`, `directoriesSlice`, `outputSlice`, `writingsSlice`

Inference fields (provider, model, temperature, maxTokens, reasoning) are present on:
- `Post` / `Writing` interfaces (optional, set after first save or inference run)
- `OutputItem` interface (required fields with defaults)
The `output/loadAll/fulfilled` addMatcher in both postsSlice and writingsSlice maps ALL
inference fields from OutputItem → Post/Writing on both add (new) and update (existing).
The `updateOutputItem.fulfilled` reducer explicitly spreads all five inference fields.

## Component Testing: react-i18next + Radix UI
See `component-testing.md` for:
- How to mock react-i18next (t(key) → key)
- How to mock AppSelect/AppSwitch as native HTML elements
- getSelectByLabelKey() helper pattern
- PersonalitySettingsPanel disabled state logic
- Pre-existing test failures (do not investigate)

### console.error lines in test output are expected
`IpcErrorHandler.ts` logs every caught error. Tests exercising "no workspace" or
service-throws paths will emit `[IPC Error] channel: Error:` — these are NOT test failures.

## Preload-Bridge Gaps — window.api vs Namespaced APIs

The preload-bridge stub (`tests/mocks/preload-bridge.ts`) only covers the FLAT `window.api` methods.
The app ALSO exposes namespaced window properties: `window.workspace`, `window.output`,
`window.personality`, `window.posts`, `window.notification`, `window.ai`, etc.

**These window namespaces are NOT in the preload-bridge mock** — always install them manually:
```typescript
Object.defineProperty(window, 'workspace', { value: { getCurrent: mockFn }, writable: true, configurable: true })
Object.defineProperty(window, 'output', { value: { onFileChange: mockFn }, writable: true, configurable: true })
```

**window.api methods also missing from preload-bridge** (extend via Object.defineProperty in beforeEach):
- `outputLoadAll` — used by `loadOutputItems` thunk (outputSlice)
- `personalityLoadAll` — used by `loadPersonalityFiles` thunk (personalityFilesSlice)
- `postsLoadFromWorkspace` — used by `usePostsLoader` and `reloadPostsFromWorkspace`
- `notificationShow` IS in preload-bridge (line 110); workspaceGetCurrent IS in bridge (line 136)

**Pattern to extend window.api in test beforeEach**:
```typescript
const mockOutputLoadAll = jest.fn().mockResolvedValue([])
beforeEach(() => {
  Object.defineProperty(window, 'api', {
    value: { ...window.api, outputLoadAll: mockOutputLoadAll },
    writable: true, configurable: true
  })
})
```

## Hooks With Tests (as of 2026-02-24)
All hooks in `src/renderer/src/hooks/` now have test files **except**:
`useTask`, `useLlmChat` — no test yet written.
Already tested: useAI, useAgent, useBluetooth, useClipboard, useContextMenu, useCron,
useDialogs, useFilesystem, useIsDark, useLanguage, useLifecycle, useMediaDevices,
useMediaPermissions, useMediaRecorder, useMediaStream, useNetwork, useNotifications,
usePipeline, usePlatform, useTheme, useWindowManager, usePersonalityFiles (x2: old +
new), useOutputFiles, usePostsFileWatcher, usePostsLoader.

## Chokidar v5 — ESM Incompatibility with ts-jest

chokidar v5 is pure ESM. ts-jest runs in CJS mode and CANNOT parse it when imported transitively.

**Fix**: Register a CJS-compatible stub in `jest.config.cjs` for the "main" project:
```javascript
moduleNameMapper: {
  '^electron$': '<rootDir>/tests/mocks/electron.ts',
  '^chokidar$': '<rootDir>/tests/mocks/chokidar.ts',
}
```
The stub is at `tests/mocks/chokidar.ts`. Tests that need to control watcher behavior can
override it with a local `jest.mock('chokidar', () => ...)` factory placed BEFORE any imports.

## setInterval Infinite Loop With Fake Timers

DocumentsWatcherService and FileWatcherService call `setInterval(cleanupIgnoredWrites, 10000)`
in their constructors. Using `jest.runAllTimers()` fires this interval infinitely:
`"Aborting after running 100000 timers, assuming an infinite loop!"`

**Fix**: Use `jest.advanceTimersByTime(500)` instead — advances past the 300ms debounce
timer without cycling the 10-second cleanup interval.

## workspace:changed Async Settlement (Fire-and-Forget)

Watcher services call `this.startWatching(path).catch(...)` as fire-and-forget inside their
`workspace:changed` event handler. The promise chain (stop watcher → mkdir → chokidar.watch)
needs multiple microtask ticks to settle. `await Promise.resolve()` alone is NOT enough.

**Fix**: Use triple `await Promise.resolve()` after emitting the event:
```typescript
eventBus.emit('workspace:changed', { currentPath: '/new/path', previousPath: null })
await Promise.resolve()
await Promise.resolve()
await Promise.resolve()
expect(mockChokidarWatch).toHaveBeenCalled()
```
Alternatively, use `jest.useRealTimers()` + `await new Promise(r => setTimeout(r, 50))` for
tests where fake timers aren't needed.

## LoggerService — Init Buffer Drain Pattern

LoggerService buffers an "Logger initialized" INFO message during construction. When tests
call `service.flush()` this message is written, causing `expect(mockAppendFileSync).not.toHaveBeenCalled()`
to fail even when the log level correctly suppressed the test's own message.

**Fix**: Drain the init buffer THEN clear the spy before asserting:
```typescript
service = makeLogger(null, { minLevel: LogLevel.INFO })
service.flush()            // drain the constructor's buffered init messages
mockAppendFileSync.mockClear()  // now only test-controlled messages are tracked
service.debug('Src', 'Should be suppressed')
service.flush()
expect(mockAppendFileSync).not.toHaveBeenCalled()
```
Same rule applies to any test that asserts on exact call counts after construction.

## ThemeIpc — Uses ipcMain.on Not ipcMain.handle

ThemeIpc registers a single `ipcMain.on('theme:set', handler)` listener (NOT `ipcMain.handle`).
Verify registration with `(ipcMain.on as jest.Mock).mock.calls` not `ipcMain.handle` calls.
The handler reads `nativeTheme.themeSource` — add `nativeTheme` to `tests/mocks/electron.ts`:
```typescript
const nativeTheme = {
  themeSource: 'system' as 'light' | 'dark' | 'system',
  shouldUseDarkColors: false,
  on: jest.fn(), once: jest.fn(), removeListener: jest.fn()
}
```

## IPC Handler Counts (Batch 2 — confirmed passing 2026-02-24)

| Module | Pattern | Handlers | Channels |
|---|---|---|---|
| OutputIpc | window-scoped service | 6 | output:save/update/load-all/load-by-type/load-one/delete |
| PersonalityIpc | window-scoped service | 6 | personality:save/load-all/load-one/delete/load-section-config/save-section-config |
| PostsIpc | direct fs access | 4 | posts:sync/update/delete/load-from-workspace |
| TaskIpc | global service | 3 | task:submit/cancel/list |
| ThemeIpc | ipcMain.on (not handle) | 1 | theme:set |

## Pre-Existing Renderer Test Failures (as of 2026-02-24)

25 renderer test suites fail. These are NOT caused by main-process test work. Failing suites:
useMediaPermissions, HomePage, useDialogs, useWindowManager, useFilesystem, useBluetooth,
WelcomePage, useNetwork, useNotifications, useClipboard, useCron, useLanguage, useBrainFiles,
usePlatform, TitleBar, useLifecycle, useContextMenu, CopyButton, WindowControls,
brainFilesSlice, usePersonalityFiles, useOutputFiles, useTheme, useAgent, usePostsLoader.

See `patterns.md` for detailed testing patterns and examples.
