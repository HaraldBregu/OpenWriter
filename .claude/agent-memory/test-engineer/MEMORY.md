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
Confirmed in `tests/unit/main/tasks/handlers/AIChatHandler.test.ts`.

### Renderer-process tests
`jest.config.cjs` applies `tests/transforms/vite-env-transform.cjs` to all
`src/renderer/**` files. Rewrites `import.meta.env.VITE_X` → `globalThis.__VITE_ENV__?.VITE_X`.
No test-side shim needed. See `ipc-bridge-testing.md` for details.

## react-i18next Mock Pattern
Always mock BEFORE the component import. t(key) returns the key itself:
```typescript
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: jest.fn() } }),
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}))
```
Then query by key: `screen.getByTitle('titleBar.close')`. See `component-testing.md`.

## window.* Mock Isolation Issue (resetMocks:true)

`resetMocks: true` resets mock call history. But when you use `.mock.calls[0]` to
inspect call arguments, the index may be wrong if the same mock was used in prior tests
and `resetMocks` did not fully reset it. **Use fresh mocks per test** for payload assertions:
```typescript
const spy = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
Object.defineProperty(window, 'task', { value: { ...window.task, submit: spy }, writable: true, configurable: true })
// spy.mock.calls[0] is guaranteed to be from the current test
```
Or use `expect(spy).toHaveBeenCalledWith('channel', expect.objectContaining({ field: value }))`.

## React 19 + RTL 16 Test Isolation
Async state updates from one test can bleed into the next test's `act()`. Symptoms:
- Tests pass alone but fail together
- `TypeError: Cannot read properties of null (reading 'X')`

Fix: separate describe blocks per logical group, each with its own `afterEach` that
resets shared state. Always call `unmount()` in tests with never-resolving promises.

## window.ai Mock Pattern
Hook `usePipeline` uses `window.ai.inference/cancel/onEvent`:
```typescript
Object.defineProperty(window, 'ai', { value: { inference: jest.fn().mockResolvedValue(...), cancel: jest.fn(), onEvent: jest.fn().mockImplementation(cb => { listeners.push(cb); return () => {...} }) }, writable: true, configurable: true })
// afterEach: Object.defineProperty(window, 'ai', { value: undefined, writable: true, configurable: true })
```

## IPC / Service Mocking Patterns

### WindowContextManager chain
```typescript
const mockWindowContext = { getService: jest.fn().mockReturnValue(mockService) }
const mockWindowContextManager = { get: jest.fn().mockReturnValue(mockWindowContext) }
container.register('windowContextManager', mockWindowContextManager)
```

### window.api mock (preload bridge)
Located at `tests/mocks/preload-bridge.ts`. Reset with `resetMockApi()` in `beforeEach`.

## Key Module Renames (brain → personality)
- `src/main/services/brain-files` → `src/main/services/personality-files` → `PersonalityFilesService`
- `src/renderer/src/store/brainFilesSlice` → `personalityFilesSlice`
- `src/renderer/src/hooks/useBrainFiles` → `usePersonalityFiles`

## PersonalityFilesService API
- `save({ sectionId, content, metadata })` — writes config.json + DATA.md in `YYYY-MM-DD_HHmmss/`
- `loadAll()` — uses `fs.access` (NOT `fs.stat`) for directory existence
- `loadOne(sectionId, fileId)` — TWO separate args
- `delete(sectionId, fileId)` — TWO separate args; uses `fs.rm({ recursive: true })`
- `readdir` called with `{ withFileTypes: true }` — mock with `makeDirent(name, isDir)`

## Redux Slice Testing Conventions
See `chatSlice.test.ts` for canonical pattern. Selector root state cast:
```typescript
{ chat: createInitialState() }  // for chatSlice
{ output: createInitialState() } as unknown as Parameters<typeof selector>[0]  // for outputSlice
```
Async thunk extra-reducers: `{ type: thunk.pending.type }` / `{ type: thunk.fulfilled.type, payload }`.
Cross-slice matchers: `writingsReducer(state, { type: 'output/loadAll/fulfilled', payload: items })`.

## Test File Locations
- Main process: `tests/unit/main/`
- Renderer: `tests/unit/renderer/`
- Integration: `tests/integration/`
- Mocks: `tests/mocks/`
- Setup: `tests/setup/renderer.ts` (installed globally for renderer tests)

## Pre-existing Failures (do not investigate)
- `brainFilesSlice.test.ts` — 10 failures (slice renamed, test out of sync)
- `usePostsLoader.test.ts` — 1 failure
- `WelcomePage.test.tsx` — 8 failures
- Main process: ~12 pre-existing failures in pipeline agent tests
- Baseline: **16 failed, 101 passed, 117 total** test suites as of 2026-02-25

## Topic Files
- `component-testing.md` — PersonalitySettingsPanel, Radix UI, AppSelect/AppSwitch mocking
- `ipc-bridge-testing.md` — window.* bridge testing, import.meta.env renderer fix, TitleBar
