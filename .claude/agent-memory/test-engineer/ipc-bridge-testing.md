# IPC Bridge Testing Patterns

## import.meta.env in Renderer Source Files

**Problem**: `PersonalityTaskContext.tsx` uses `import.meta.env.VITE_OPENAI_MODEL`. ts-jest in
CJS mode throws `SyntaxError: Cannot use 'import.meta' outside a module` when loading this file.

**Solution**: Added `vite-env-transform.cjs` to the renderer project in jest.config.cjs:

```js
// jest.config.cjs — renderer project transform block
transform: {
  // Apply the vite-env-transform to renderer source files that may contain import.meta.env.*
  '^.+/src/renderer/.+\\.tsx?$': '<rootDir>/tests/transforms/vite-env-transform.cjs',
  // All other TypeScript files use vanilla ts-jest
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.web.json', useESM: false }]
}
```

The transform rewrites `import.meta.env.VITE_X` → `globalThis.__VITE_ENV__?.VITE_X`.
The global is NOT seeded for renderer tests (unlike main tests), so the value is `undefined`
and the code falls through to any default value in the application code.

**Confirmed working** for: PersonalityTaskContext.test.tsx

## Mock Isolation: window.* mocks and resetMocks:true

`resetMocks: true` in jest.config.cjs resets mock call counts AND implementations between tests.
But when you access `window.task.submit.mock.calls[0]` in a test AFTER other tests have run,
the index may not be 0 if `resetMocks` doesn't properly reset mocks defined via `Object.defineProperty`.

**Problem pattern**: Using `.mock.calls[0][1]` to get the payload of a call made in the current
test fails when the mock was already called by a previous test (call index leaks).

**Solution**: Create a fresh mock function inline for payload inspection:
```typescript
const submitMock = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
Object.defineProperty(window, 'task', {
  value: { ...window.task, submit: submitMock },
  writable: true, configurable: true
})
// Now submitMock.mock.calls[0] is guaranteed to be the current test's call
```

Or use `expect.objectContaining(...)` with `toHaveBeenCalledWith` which doesn't depend on index.

## window.win useEffect crash pattern

TitleBar calls `window.win.isMaximized()` inside a `useEffect`. When `window.win` is undefined:
- The synchronous `render()` call does NOT throw (useEffect is async)
- The title bar renders fine during the synchronous phase
- The effect crashes after the render paint

Therefore: `expect(() => render(<TitleBar />)).not.toThrow()` when `window.win` is undefined.
The crash happens in the effect and would normally be caught by an ErrorBoundary.

## react-i18next mock (TitleBar and any component using useTranslation)

Always mock `react-i18next` BEFORE the component import, returning the key as-is:

```typescript
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn() }
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}))
```

Then assert against the i18n key constants, not translated strings:
```typescript
const KEYS = { close: 'titleBar.close', minimize: 'titleBar.minimize', ... }
await user.click(screen.getByTitle(KEYS.close))
```

i18n key values are in `/resources/i18n/en/main.json`.

## PersonalityTaskContext: MockPersonalityTaskService injection

The provider accepts a `service` prop for dependency injection. Always pass a
`MockPersonalityTaskService` instance in tests — never let the singleton
`electronPersonalityTaskService` be instantiated (it immediately calls `window.task`).

```typescript
const service = new MockPersonalityTaskService()
render(
  <Provider store={store}>
    <PersonalityTaskProvider service={service}>
      {children}
    </PersonalityTaskProvider>
  </Provider>
)
```

## Task ID counter in MockPersonalityTaskService

The mock's `submitTask` increments a counter: taskId = `mock-task-${++counter}`.
First submit → `mock-task-1`, second → `mock-task-2`, etc.
Counter resets when you instantiate a new `MockPersonalityTaskService()`.
Create a new instance in each test to get predictable IDs.

## IPC Bridge test locations

- `tests/unit/renderer/services/ElectronPersonalityTaskService.test.ts` — service unit tests
- `tests/unit/renderer/integration/IpcBridge.test.ts` — all window bridges, optional-chaining safety
- `tests/unit/renderer/contexts/PersonalityTaskContext.test.tsx` — context + hook tests
- `tests/unit/renderer/components/TitleBar.test.tsx` — component using window.win + window.app
