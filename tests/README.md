# Testing Guide

This document covers how to run, write, and maintain tests for the OpenWriter Electron application.

## Prerequisites

- Node.js >= 22.0.0
- Yarn package manager
- Dependencies installed (`yarn install`)

## Quick Start

```bash
# Run all unit and integration tests
npm test

# Run E2E tests (requires a build first)
npx electron-vite build && yarn test:e2e
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all Jest unit and integration tests |
| `npm run test:main` | Run only main process tests |
| `npm run test:renderer` | Run only renderer process tests |
| `npm run test:coverage` | Run all tests with coverage report |
| `yarn test:e2e` | Run Playwright E2E tests |

## Test Architecture

The test suite is split into three layers matching the Electron multi-process architecture:

```
tests/
├── e2e/                          # Playwright E2E tests (full app)
│   ├── electron-helpers.ts       # App launch/close/navigation helpers
│   ├── app-launch.spec.ts        # App startup and security checks
│   ├── ipc-bridge.spec.ts        # IPC communication verification
│   ├── navigation.spec.ts        # Hash-based routing between pages
│   ├── theme.spec.ts             # Dark/light mode toggling
│   ├── store-persistence.spec.ts # Settings persistence across sessions
│   └── window-management.spec.ts # Window controls and resizing
├── unit/
│   ├── main/                     # Main process tests (Node environment)
│   │   ├── core/                 # ServiceContainer, EventBus, Observable, AppState, WindowFactory
│   │   ├── ipc/                  # IPC handler registration tests
│   │   ├── menu/                 # Menu and Tray builder tests
│   │   ├── services/             # Service class tests
│   │   └── shared/               # Validators, i18n, PathValidator, IpcErrorHandler
│   └── renderer/                 # Renderer process tests (jsdom environment)
│       ├── components/           # React component tests
│       ├── hooks/                # Custom hook tests
│       ├── pages/                # Page-level smoke tests
│       └── store/                # Redux slice tests
├── mocks/
│   ├── electron.ts               # Comprehensive Electron API mock
│   ├── preload-bridge.ts         # window.api mock (~60+ methods)
│   └── fileMock.ts               # Static asset stub (images, fonts)
├── setup/
│   ├── polyfills.ts              # TextEncoder/TextDecoder for jsdom
│   └── renderer.ts               # jest-dom matchers, window.api/electron mocks, browser stubs
└── helpers/
    ├── render-with-providers.tsx  # renderWithProviders (Redux + HashRouter)
    └── test-utils.ts             # createMockIpcEvent, createMockThread, flushPromises
```

## Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.cjs` | Multi-project Jest config (main = Node env, renderer = jsdom env) |
| `playwright.config.ts` | Playwright config for Electron E2E tests |

## Unit Tests (Jest)

### Multi-Project Setup

Jest is configured with two projects that run in parallel:

- **`main`** - Tests for the Electron main process. Runs in a **Node** environment. The `electron` module is automatically mocked via `moduleNameMapper`.
- **`renderer`** - Tests for the React renderer process. Runs in **jsdom**. Path aliases (`@/`, `@components/`, etc.), CSS modules, and static assets are all handled via `moduleNameMapper`.

### Writing Main Process Tests

Main process tests go in `tests/unit/main/` and have access to the full Electron mock:

```typescript
// tests/unit/main/services/MyService.test.ts
import { MyService } from '../../../../src/main/services/MyService'
// 'electron' is auto-mocked — no jest.mock() needed
import { BrowserWindow } from 'electron'

describe('MyService', () => {
  it('should do something', () => {
    const service = new MyService()
    expect(service.doSomething()).toBe(true)
  })
})
```

The Electron mock (`tests/mocks/electron.ts`) provides stubs for: `BrowserWindow`, `app`, `ipcMain`, `ipcRenderer`, `dialog`, `clipboard`, `nativeImage`, `Menu`, `Tray`, `Notification`, `contextBridge`, `shell`, `systemPreferences`.

### Writing Renderer Process Tests

Renderer tests go in `tests/unit/renderer/` and automatically have:

- `@testing-library/jest-dom` matchers (`.toBeInTheDocument()`, etc.)
- `window.api` mock with all preload bridge methods
- `window.electron` mock with `ipcRenderer`
- Browser API stubs (`matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollIntoView`)

#### Testing Components

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@components/MyComponent'

// Mock lucide-react icons if the component uses them
jest.mock('lucide-react', () => ({
  IconName: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'icon-name' })
}))

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

#### Testing Components with Redux / Router

Use the `renderWithProviders` helper:

```typescript
import { renderWithProviders } from '../../../helpers/render-with-providers'

it('should render with store and router', () => {
  renderWithProviders(<MyPage />, {
    preloadedState: { chat: { threads: [], activeThreadId: null } }
  })
  expect(screen.getByText('Welcome')).toBeInTheDocument()
})
```

#### Testing Custom Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

it('should update state', async () => {
  ;(window.api.someMethod as jest.Mock).mockResolvedValue('result')

  const { result } = renderHook(() => useMyHook())

  await waitFor(() => {
    expect(result.current.value).toBe('result')
  })
})
```

### Resetting Mocks

The renderer setup automatically calls `resetMockApi()` in `beforeEach` and `jest.restoreAllMocks()` in `afterEach`. You generally don't need manual cleanup, but if a hook uses module-level caching, mock the return value in each test's `beforeEach`.

### Coverage

Run with coverage:

```bash
npm run test:coverage
```

Coverage thresholds are set at **50% minimum** for branches, functions, lines, and statements. Reports are generated in the `coverage/` directory in `text`, `lcov`, and `clover` formats.

## E2E Tests (Playwright)

### How It Works

E2E tests launch the **real built Electron app** using Playwright's `_electron` API. The app must be built before running E2E tests.

### Running E2E Tests

```bash
# Build the app
npx electron-vite build

# Run E2E tests
yarn test:e2e

# Run a specific spec file
npx playwright test --config playwright.config.ts tests/e2e/app-launch.spec.ts

# Run with debug mode
npx playwright test --config playwright.config.ts --debug
```

### Writing E2E Tests

E2E tests go in `tests/e2e/` with a `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './electron-helpers'

let ctx: AppContext

test.beforeAll(async () => {
  ctx = await launchApp()
})

test.afterAll(async () => {
  await closeApp(ctx)
})

test('app should display the title', async () => {
  const title = await ctx.page.title()
  expect(title).toContain('Tesseract')
})
```

### E2E Helpers

The `electron-helpers.ts` module provides:

| Helper | Description |
|--------|-------------|
| `launchApp()` | Launch the Electron app and return `{ app, page }` |
| `closeApp(ctx)` | Gracefully close the app |
| `waitForAppReady(page)` | Wait for `#root` and React hydration |
| `navigateTo(page, path)` | Navigate to a hash route (e.g., `/home`) |
| `getCurrentRoute(page)` | Get the current `window.location.hash` |
| `getWindowTitle(app)` | Get the BrowserWindow title |

### E2E Configuration

Key settings in `playwright.config.ts`:

- **Timeout**: 30 seconds per test
- **Workers**: 1 (serial execution since Electron tests share the OS window system)
- **Retries**: 1 on CI, 0 locally
- **Artifacts**: Screenshots and traces saved to `test-results/`
- **Report**: HTML report generated in `playwright-report/`

### Platform Notes

- **Windows DPI scaling**: Window dimensions may differ by +/- 4 pixels due to DPI rounding. Use tolerance-based assertions for size checks.
- **Cold start**: First Electron launch can take >30 seconds. Use a 60-second timeout in `beforeAll` for app-launch tests.
- **CI environments**: Set `ELECTRON_DISABLE_SANDBOX=1` on Linux CI runners.

## Common Patterns

### Mocking `window.api` Methods

All `window.api` methods are pre-mocked as `jest.fn()`. Set return values per test:

```typescript
;(window.api.clipboardWriteText as jest.Mock).mockResolvedValue(undefined)
;(window.api.getPlatform as jest.Mock).mockResolvedValue('win32')
;(window.api.workspaceGetRecent as jest.Mock).mockResolvedValue([
  { path: '/projects/my-app', lastOpened: Date.now() }
])
```

### Handling Async State Updates

Always wrap async state changes with `act()` or use `waitFor()`:

```typescript
// Option 1: act() for direct async calls
await act(async () => {
  await result.current.doAsyncThing()
})

// Option 2: waitFor() for state that settles asynchronously
await waitFor(() => {
  expect(result.current.isReady).toBe(true)
})
```

### Mocking lucide-react Icons

Components using lucide-react icons need them mocked to avoid SVG rendering complexity in jsdom:

```typescript
jest.mock('lucide-react', () => ({
  Send: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'icon-send' }),
  Copy: (props: Record<string, unknown>) =>
    React.createElement('svg', { ...props, 'data-testid': 'icon-copy' })
}))
```

### Testing with Fake Timers

For components with `setTimeout`/`setInterval`:

```typescript
beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it('should update after delay', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  render(<MyComponent />)

  await user.click(screen.getByText('Start'))

  await act(async () => {
    jest.advanceTimersByTime(2000)
  })

  expect(screen.getByText('Done')).toBeInTheDocument()
})
```

## Troubleshooting

### `TextEncoder is not defined`
The `tests/setup/polyfills.ts` file handles this. If you see this error, ensure the renderer project in `jest.config.cjs` has `setupFiles: ['<rootDir>/tests/setup/polyfills.ts']`.

### `Invalid hook call` in hook tests
This usually means duplicate React instances. Avoid `jest.resetModules()` in renderer tests. If you need to reset module-level state, mock the specific values instead.

### `scrollIntoView is not a function`
jsdom doesn't implement `scrollIntoView`. It's stubbed in `tests/setup/renderer.ts`. If you see this in a new test, ensure the test is in the `renderer` project (under `tests/unit/renderer/`).

### E2E tests fail with "Cannot find module"
The app must be built before running E2E tests. Run `npx electron-vite build` first.

### E2E window size assertions off by a few pixels
Windows DPI scaling can cause small deviations. Use tolerance: `expect(width).toBeGreaterThan(896)` instead of exact equality.
