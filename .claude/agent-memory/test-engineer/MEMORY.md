# Test Engineer Memory — OpenWriter

## Project Setup
- **Test command**: `npm test` (uses `npx jest --config jest.config.cjs`)
- **Run single file**: `npx jest --config jest.config.cjs --testPathPatterns=<filename>`
- **Capture test output**: jest writes to STDERR — use `2>/tmp/out.txt; cat /tmp/out.txt`
- **Jest**: v30, **React**: v19, **RTL**: v16, **jsdom** environment for renderer tests
- **Coverage thresholds**: 50% minimum (branches/functions/lines/statements)
- **Multi-project setup**: "main" (node env) + "renderer" (jsdom env)
- **Path aliases**: `@/` → src/renderer/src/, `@store/` → src/renderer/src/store/, etc.

## import.meta.env Handling

### Main-process tests
Files using `import.meta.env.VITE_*` require a shim before imports:
```typescript
const metaEnv = { VITE_OPENAI_API_KEY: undefined, VITE_OPENAI_MODEL: undefined }
Object.defineProperty(global, 'import', { value: { meta: { env: metaEnv } }, writable: true, configurable: true })
```

### Renderer-process tests
`jest.config.cjs` applies `tests/transforms/vite-env-transform.cjs` to all
`src/renderer/**` files. No test-side shim needed. See `ipc-bridge-testing.md`.

## react-i18next Mock Pattern
Always mock BEFORE the component import. t(key) returns the key itself:
```typescript
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: jest.fn() } }),
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}))
```

## window.* Mock Isolation Issue (resetMocks:true)
`resetMocks: true` resets mock call history. Use fresh mocks per test for payload assertions.

## React 19 + RTL 16 Test Isolation
Async state updates from one test can bleed into the next test's `act()`. Fix: separate
describe blocks per logical group, each with its own `afterEach`. Always call `unmount()`
in tests with never-resolving promises.

## IPC / Service Mocking Patterns

### window.api mock (preload bridge)
Located at `tests/mocks/preload-bridge.ts`. Reset with `resetMockApi()` in `beforeEach`.

### window.tasksManager mock (preload bridge for tasks)
Exposed as `window.tasksManager` (NOT `window.task` — that is a different namespace).
For taskEventBus/taskStore tests, mock directly:
```typescript
Object.defineProperty(window, 'tasksManager', {
  value: { onEvent: jest.fn().mockImplementation((cb) => { globalCb = cb; return () => {} }) },
  writable: true, configurable: true
})
```
Clean up in `afterEach` by setting value to `undefined`.

## Module Singleton Reset Pattern (renderer)
`taskStore` and `taskEventBus` are module-level singletons. To isolate tests:
1. Call `jest.resetModules()` in `beforeEach`
2. `require()` the module fresh inside each test (dynamic require, not static import)
3. **Do NOT use `jest.isolateModules()` with a synchronous callback** — the require
   result is scoped to the callback and inaccessible outside.

## TaskManager Architecture
- **Source path**: `src/main/taskManager/` (NOT `src/main/tasks/`)
- **TaskExecutor**: priority queue, maxConcurrency=5, AbortController per task, 5min TTL store
- **TaskStatus**: 'queued' | 'running' | 'completed' | 'error' | 'cancelled' (NO 'paused')
- **StreamReporter.stream(data)**: raw batch delivery, NO accumulation in executor
- **TrackedTaskState**: NO streamedContent/content/seedContent (those live in taskEventBus)
- **taskStore.applyEvent**: NOT exported as a named export — access via `taskStore.applyEvent`
- **taskEventBus.TaskSnapshot**: HAS streamedContent/content/seedContent fields
- **EventBus mock needs**: `broadcast`, `sendTo`, AND `emit` methods

## TaskExecutor Testing Notes
- Use `jest.useFakeTimers()`; use `jest.advanceTimersByTime(N)` NOT `jest.runAllTimers()`
  because the GC interval (60s) causes an infinite loop with `runAllTimers()`
- GC interval is unref'd but still ticks with fake timers
- `HangingHandler`: resolves via `_resolve()`, rejects AbortError when signal fires
- AbortError detection: `err.name === 'AbortError'` (not instanceof DOMException in Node)

## Key Module Renames (brain → personality)
- `src/main/services/brain-files` → `PersonalityFilesService`
- `src/renderer/src/store/brainFilesSlice` → `personalityFilesSlice`
- `src/renderer/src/hooks/useBrainFiles` → `usePersonalityFiles`

## Redux Slice Testing Conventions
See `chatSlice.test.ts` for canonical pattern.
Async thunk extra-reducers: `{ type: thunk.pending.type }` / `{ type: thunk.fulfilled.type, payload }`.

## Test File Locations
- Main process: `tests/unit/main/`
- Renderer: `tests/unit/renderer/`
- Integration: `tests/integration/`
- Mocks: `tests/mocks/`
- Setup: `tests/setup/renderer.ts` (installed globally for renderer tests)

## Pre-existing Failures (do not investigate)
- `brainFilesSlice.test.ts` — 10 failures (slice renamed)
- `usePostsLoader.test.ts` — 1 failure
- `WelcomePage.test.tsx` — 8 failures
- Main process: ~12 pre-existing failures in pipeline agent tests
- `TaskExecutorService.test.ts` (old) — imports from `src/main/tasks/` (stale path)
- Baseline: **16 failed, 101 passed** as of 2026-02-25

## Topic Files
- `component-testing.md` — PersonalitySettingsPanel, Radix UI, AppSelect/AppSwitch mocking
- `ipc-bridge-testing.md` — window.* bridge testing, import.meta.env renderer fix, TitleBar
