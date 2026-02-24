# Test Engineer Memory — Tesseract AI

## Project Setup
- **Test command**: `npm test` (uses `npx jest --config jest.config.cjs`)
- **Run single file**: `npx jest --config jest.config.cjs --testPathPatterns=<filename>`
- **Jest**: v30, **React**: v19, **RTL**: v16, **jsdom** environment for renderer tests
- **Coverage thresholds**: 50% minimum (branches/functions/lines/statements)
- **Multi-project setup**: "main" (node env) + "renderer" (jsdom env)
- **Path aliases**: `@/` → src/renderer/src/, `@store/` → src/renderer/src/store/, etc.

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

**Slices with tests as of 2026-02-24**:
`chatSlice`, `postsSlice`, `brainFilesSlice`, `directoriesSlice`, `outputSlice`, `writingsSlice`

See `patterns.md` for detailed testing patterns and examples.
