# Tesseract AI Testing Implementation Plan

## Phase 1: Foundation [COMPLETE]
- Jest config, dependencies, mocks, helpers, validation tests

## Phase 2: Renderer Unit Tests
Target: ~80% coverage on renderer code
- Components: WindowControls, TitleBar, AppLayout, Button, Input, CopyButton, MarkdownContent, ContentBlock
- Store: chatSlice (done), add edge case tests
- Hooks: useClipboard, useNetwork, useFilesystem, useDialogs, useNotifications, useWindowManager, useAgent, useRag, useTheme, useLanguage, useContextMenu, useBluetooth, useCron, useLifecycle, useMediaPermissions
- Utils: cn (done)
- Pages: WelcomePage, HomePage, DashboardPage (smoke tests)
- Complexity: Medium-High (many hooks depend on window.api mock)

## Phase 3: Main Process Unit Tests
Target: ~80% coverage on main process code
- Core: AppState (done), ServiceContainer (done), EventBus (done), Observable, WindowFactory
- Services: StoreService, ClipboardService, NetworkService, FilesystemService, DialogService, NotificationService, CronService, BluetoothService, LifecycleService, MediaPermissionsService, WindowManagerService, AgentService
- IPC: All 16 IPC modules (test they call correct service methods)
- Shared: validators (done), PathValidator, IpcErrorHandler (done)
- RAG: RagController, ragLoader, ragChain
- Other: Main class, bootstrap, tray
- Complexity: Medium (mostly mocking Electron APIs and fs)

## Phase 4: Integration Tests
- IPC round-trips (IPC module -> service -> response validation)
- Bootstrap integration (verify all services register correctly)
- Feature flows: file open/save, agent chat session lifecycle
- Complexity: High

## Phase 5: E2E Tests (Playwright)
- Install @playwright/test, electron support
- App launch/close, navigation, page rendering
- File operations flow, agent chat interaction
- Complexity: High (Electron Playwright setup)

## Phase 6: CI/CD + Specialized
- GitHub Actions workflow: unit tests on PR, E2E on main
- Accessibility: jest-axe for component a11y
- Security: verify nodeIntegration=false, contextIsolation=true
- Performance: startup time, memory profiles
