# Electron Test Architect Memory

## Project Architecture
- Electron app with Main (src/main/), Renderer (src/renderer/src/), Preload (src/preload/)
- ESM project ("type": "module" in package.json) - Jest config MUST be .cjs
- Package manager: Yarn (not npm). Node >= 22.
- Path aliases: @/, @utils/, @pages/, @store/, @components/, @icons/, @resources/
- Some UI components import via bare `src/renderer/src/` path (e.g., button.tsx) - need moduleNameMapper

## Testing Infrastructure (Phase 1 Complete)
- Config: `jest.config.cjs` with two projects: "main" (node env) and "renderer" (jsdom env)
- Dependencies: jest, ts-jest, @testing-library/{react,dom,jest-dom,user-event}, identity-obj-proxy, jest-environment-jsdom
- Setup: `tests/setup/renderer.ts` (jest-dom matchers, window.api mock, matchMedia/ResizeObserver stubs, TextEncoder/TextDecoder polyfill, scrollIntoView stub)
- Mocks: `tests/mocks/electron.ts`, `tests/mocks/preload-bridge.ts`, `tests/mocks/fileMock.ts`
- Helpers: `tests/helpers/render-with-providers.tsx`, `tests/helpers/test-utils.ts`
- Key config: `setupFilesAfterEnv` (NOT setupFilesAfterSetup), `coverageThreshold` (NOT coverageThresholds)

## Phase 4 Complete: 40 E2E tests + 567 unit tests (all passing)

### Phase 4 E2E Tests (40 tests, 6 spec files)
- Config: `playwright.config.ts` at root, `tests/e2e/` test dir, serial workers (1)
- Helpers: `tests/e2e/electron-helpers.ts` (launchApp, closeApp, waitForAppReady, navigateTo, getCurrentRoute)
- **app-launch.spec.ts** (9 tests): window open, visible, root, WelcomePage, title bar, dimensions, context isolation, nodeIntegration, api bridge
- **ipc-bridge.spec.ts** (9 tests): api object, platform, maximized, network, notifications, bluetooth, lifecycle, agent, clipboard
- **navigation.spec.ts** (7 tests): WelcomePage, Home, Dashboard, Settings, Clipboard, back to Welcome, AppLayout sidebar
- **theme.spec.ts** (4 tests): dark start, shouldUseDarkColors, switch light, switch back dark
- **store-persistence.spec.ts** (6 tests): empty settings, set/get model, API token, workspace, recent workspaces, clear
- **window-management.spec.ts** (5 tests): maximize/restore, minimize/restore, control buttons, bounds, resize
- npm scripts: `test:e2e` runs `npx playwright test --config playwright.config.ts`

## Phases 1-3: 567 unit/integration tests across 70 suites

### Phase 1 Tests (92 tests, 9 suites)
- ServiceContainer, EventBus, AppState, Validators, IpcErrorHandler
- chatSlice, cn utility, LoadingSkeleton, ErrorBoundary

### Phase 2 Tests (214 tests, 30 suites)
**Hooks (20 files):** useClipboard, useNetwork, useDialogs, useFilesystem, useLifecycle, useNotifications, useWindowManager, useMediaPermissions, useCron, useBluetooth, useTheme, useLanguage, useAgent, useRag, useContextMenu, useIsDark, usePlatform, useMediaDevices, useMediaStream, useMediaRecorder
**Components (7 files):** WindowControls, TitleBar, CopyButton, Button, Input, Badge, useIsMobile
**Pages (3 files):** HomePage, WelcomePage, DashboardPage

### Phase 3 Tests (261 tests, 31 suites)
**Services (11 files):** ClipboardService, NetworkService, BluetoothService, NotificationService, DialogService, FilesystemService, LifecycleService, MediaPermissionsService, CronService, WindowManagerService, StoreService, AgentService
**IPC Modules (13 files):** ClipboardIpc, NetworkIpc, BluetoothIpc, DialogIpc, NotificationIpc, LifecycleIpc, FilesystemIpc, CronIpc, WindowIpc, MediaPermissionsIpc, StoreIpc, WorkspaceIpc, CustomIpc
**Core (2 files):** Observable, WindowFactory
**Shared (2 files):** PathValidator, i18n
**Menu (2 files):** Menu, Tray

## Key Lessons & Patterns

### Renderer (Phase 2)
- react-router-dom v7 requires TextEncoder/TextDecoder polyfill in jsdom
- Element.scrollIntoView must be stubbed in jsdom for components that use ref.scrollIntoView()
- usePlatform has module-level cache - don't use jest.resetModules() as it breaks React hooks context
- useAgent/useRag need Redux Provider wrapper; use configureStore + createThread in test helpers
- When text appears in multiple DOM elements, use getAllByText instead of getByText
- For CopyButton fake timer tests: wrap jest.advanceTimersByTime in act()
- Mock lucide-react icons as simple SVG elements with data-testid for component tests
- useNotifications: catch errors inside act() to avoid unhandled rejections
- Heavy browser APIs (navigator.bluetooth, MediaRecorder) need manual mocking in beforeEach

### Main Process (Phase 3)
- Electron mock's nativeImage.createFromPath is jest.fn() with NO return value by default - must mockReturnValue with {isEmpty,getSize,toDataURL} for NotificationService tests
- StoreService has shallow-copy bug: DEFAULTS.modelSettings object is shared across instances; test isolation requires readFileSync to return fresh JSON each time (not just throw ENOENT)
- NetworkService: getNetworkInterfaces catches errors internally and returns []; getConnectionStatus never reaches its own catch block for OS errors (returns 'offline' not 'unknown')
- CronService: mock both `cron` and `cronstrue` packages; CronJob constructor takes (schedule, onTick, onComplete, autoStart, timezone)
- AgentController: mock at module level `jest.mock('../agent/AgentController')` since it imports @langchain/openai
- IPC module test pattern: create ServiceContainer + register mock service, then check ipcMain.handle/on calls
- For IPC handlers wrapped with wrapSimpleHandler: call with ({}, ...args) since first arg is event
- Menu class on Windows calls `ElectronMenu.setApplicationMenu(null)` - no buildFromTemplate
- Tray class: mock nativeImage.createFromPath to return object with resize() method
- Mock @electron-toolkit/utils as `jest.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))`

### E2E (Phase 4)
- ESM project: `__dirname` unavailable in `electron-helpers.ts` -- use `fileURLToPath(import.meta.url)` polyfill
- App cold start can take >30s on first launch; use 60s timeout for beforeAll in app-launch tests
- Playwright `app.evaluate()` callbacks don't have closure access to outer variables; pass data as second arg
- Store/Workspace IPC handlers use `wrapSimpleHandler` returning `{success: true, data: ...}` -- must unwrap
- Network/Bluetooth/Notification IPC handlers are NOT wrapped -- return raw values
- `StoreValidators.validateProviderId` rejects unknown providers; use `openai`, `anthropic`, `google`, `meta`, `mistral`
- Window resize on Windows has DPI scaling rounding (±2-4px); use tolerance assertions not exact matches
- Electron `_electron.launch()` takes `args: [mainPath]` where mainPath is `out/main/index.js`
- App must be built with `npx electron-vite build` before running E2E tests
- `playwright.config.ts`: do NOT use `projects: []` (empty array causes "No tests found"); omit projects key entirely

## Platform Notes
- Windows 11 environment. Use forward slashes in paths for bash commands.
- jest.config.cjs must use `\\\\` for regex escaping (CSS/image patterns)

## See Also
- [testing-plan.md](./testing-plan.md) for full phased implementation plan
