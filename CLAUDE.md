# CLAUDE.md

This file documents the actual architecture and design of OpenWriter. When in doubt, refer to the code structure described here rather than external assumptions.

## Project Overview

OpenWriter is a production Electron application with careful architectural attention to window isolation, extensibility, and error handling. Built with React 19, TypeScript, and electron-vite. Supports multi-platform distribution (Windows, macOS, Linux) with `.tsrct` custom file format.

## Development Commands

### Core Development Commands
- `yarn dev` - Start development mode with debugging
- `yarn dev:staging` - Start development in staging environment
- `yarn dev:prod` - Start development in production environment
- `yarn dev-linux` - Development mode for Linux (with sandbox disabled)

### Build Commands
- `yarn build` - Production build (includes typecheck)
- `yarn build:dev` - Development build (mode=development)
- `yarn build:staging` - Staging build (mode=staging)
- `yarn typecheck` - Run TypeScript checks for both main and renderer processes
- `yarn typecheck:node` - TypeScript check for main process only
- `yarn typecheck:web` - TypeScript check for renderer process only

### Testing and Quality
- `yarn test` - Run Jest tests (both main and renderer)
- `yarn test:main` - Run main process tests only
- `yarn test:renderer` - Run renderer tests only
- `yarn lint` - Run ESLint (covers src/main and src/renderer)
- Jest configuration: 50% minimum coverage thresholds with two-project setup (node + jsdom)

### Distribution
- `yarn dist-win` / `yarn dist-mac` / `yarn dist-linux:appimage` - Platform-specific builds
- Variants: `:dev` and `:staging` suffixes for environment-specific builds
- Output: `out/` directory (NOT `dist/`)

### Utilities
- `yarn clean` - Clean build artifacts (`out/`, `dist/`, caches)
- `yarn svgr` - Generate React components from SVG files

## Architecture

### Core Principle: Window Isolation & Service Container Pattern

**Problem Solved**: Previously all windows shared global service instances → workspace data leaked between windows.

**Solution**: Each BrowserWindow gets its own `WindowContext` with isolated service instances via `WindowContextManager`.

### Main Process Architecture (`src/main/`)

#### Initialization (Two-Phase Bootstrap)
1. **Phase 1 - Services**: `bootstrapServices()` creates global ServiceContainer with 15+ services
2. **Phase 2 - IPC**: `bootstrapIpcModules()` registers 22 self-contained IPC modules
3. Each phase is independent and can fail cleanly

#### Service Organization

**Global Services** (singleton, shared across all windows):
- **Core**: StoreService, LoggerService, LifecycleService, WindowManagerService
- **System**: BluetoothService, NetworkService, CronService, MediaPermissionsService, FilesystemService
- **UI**: DialogService, NotificationService, ClipboardService
- **Domain**: FileManagementService
- **Agents & Pipelines**: AgentService, AgentRegistry, PipelineService
- **Tasks**: TaskHandlerRegistry, TaskExecutorService
- **Integrations**: OutputFilesService (for AI outputs)

**Window-Scoped Services** (isolated per-window, created by `WindowScopedServiceFactory`):
- WorkspaceService (manages current workspace path)
- WorkspaceMetadataService (metadata for current workspace)
- FileWatcherService (watches workspace files)
- DocumentsWatcherService (watches document changes)
- PersonalityFilesService (manages personality configurations)
- OutputFilesService (workspace-specific outputs)

#### Key Components

**ServiceContainer** (`core/ServiceContainer.ts`):
- Minimal registry (intentionally NOT a full IoC framework)
- Typed `get<T>(key)` lookups
- Lifecycle management for `Disposable` services

**WindowContext** (`core/WindowContext.ts`):
- One per BrowserWindow (accessed via `WindowContextManager.get(windowId)`)
- Creates window-scoped ServiceContainer
- Initializes all window-scoped services via factory
- Auto-cleanup when window closes

**WindowScopedServiceFactory** (`core/WindowScopedServiceFactory.ts`):
- Registry pattern for service definitions
- Factory functions receive global container + workspace service
- Makes all window services discoverable in one place
- Extensible: adding new window service requires one registration call

**EventBus** (`core/EventBus.ts`):
- **Dual Purpose**:
  1. Main ↔ Renderer IPC via `broadcast()` and `sendTo(windowId, ...)`
  2. Main process typed events via `emit<K>()` and `on<K>()`
- **Typed Events**: service:initialized, agent:run:*, window:*, workspace:*, posts:*, documents:*, theme:*
- Implementation: Map<string, Set<Callback>> with per-listener error handling

#### IPC Architecture (22 Modules)

**Pattern**: Self-contained modules with `register(container, eventBus)` method
- No monolithic IPC handler registration
- Error handling via `wrapIpcHandler()` or `wrapSimpleHandler()`
- Returns standardized `IpcResult<T> = IpcSuccess<T> | IpcError`
- Window-scoped handlers use `getWindowService()` to access per-window services

**Modules** (in `ipc/`):
AgentIpc, BluetoothIpc, ClipboardIpc, ContextMenuIpc, CronIpc, CustomIpc, DialogIpc, DocumentsIpc, FilesystemIpc, LifecycleIpc, MediaPermissionsIpc, NetworkIpc, NotificationIpc, PipelineIpc, PostsIpc, StoreIpc, WindowIpc, WorkspaceIpc, DirectoriesIpc, TaskIpc, OutputIpc, PersonalityIpc, ThemeIpc

**Example Usage** (from WindowScopedServiceFactory → IPC):
```typescript
// Factory creates service per window
factory.register({
  key: 'workspace',
  factory: ({ storeService, eventBus }) => {
    const service = new WorkspaceService(storeService, eventBus)
    service.initialize()
    return service
  }
})

// WorkspaceIpc accesses it via getWindowService()
const workspace = getWindowService(event, container, 'workspace')
```

#### Multi-Mode Operation

**Launcher Mode** (default):
- Shows workspace selector
- Manages menu and tray
- Spawns separate workspace processes on demand

**Workspace Mode** (--workspace flag):
- Isolated window with direct workspace access
- Separate Electron process per workspace instance
- WorkspaceProcessManager handles spawn/cleanup

#### Pipeline & Task Execution

**Pipeline Service** (for streaming agent results):
- Async generator agents return `AsyncGenerator<AgentEvent>`
- Events: TokenEvent, ThinkingEvent, DoneEvent, ErrorEvent
- Per-run `AbortController` for independent cancellation
- Built-in agents: EchoAgent, ChatAgent, CounterAgent, AlphabetAgent, EnhanceAgent

**Task Executor Service** (for background tasks):
- Queue-based with configurable concurrency (default 5)
- Priority queue (high/normal/low)
- Task handlers: FileDownloadHandler, AIChatHandler, AIEnhanceHandler
- Supports progress reporting and token streaming
- Implements `Disposable` for cleanup on shutdown

### Renderer Process Architecture (`src/renderer/src/`)

#### Routing
- **HashRouter** (not BrowserRouter) for Electron compatibility
- Welcome page as standalone route
- 27+ routes under AppLayout with nested Suspense boundaries
- Lazy-loaded routes reduce initial bundle size

#### State Management
- **Redux Toolkit** with 7 slices: chat, posts, writings, directories, personalityFiles, output, aiSettings
- **listenerMiddleware** for side effects (not extraReducers)
- Typed hooks: `useAppDispatch()`, `useAppSelector()`
- Circular dependency resolution: postsHydration + writingsHydration

#### Context System
- **AppProvider** composes multiple contexts:
  - ThemeContext (light/dark/system, persistent)
  - AppStateContext (UI preferences, modal state, online status)
  - ErrorBoundary at root and route levels
- Theme class applied at module load (avoids flash)

#### Component Architecture
- Radix UI primitives + Tailwind CSS
- TipTap editor for rich text
- ErrorBoundary + LoadingSkeleton patterns
- Service layer: IPC calls via `ipcRenderer.invoke()`

### Security & Validation

**PathValidator** (`shared/PathValidator.ts`):
- Prevents path traversal attacks
- Whitelist: Documents, Downloads, Desktop, userData
- Used by workspace and file operations

**Window Security**:
- sandbox: true
- nodeIntegration: false
- Preload script as isolated bridge

### Custom File Format

**Extension**: `.tsrct` (NOT `.tsx`)
- Cross-platform file associations:
  - **macOS**: CFBundleDocumentTypes + UTExportedTypeDeclarations
  - **Linux**: MimeType in desktop file
  - **Windows**: NSIS installer configuration
- File opening flow: `app.on('open-file')` → `createWindowForFile()` → renderer

### Build System

**Bundler**: electron-vite (wrapper around Vite)
- Entry: `src/main/index.ts`
- Output: `out/` directory (NOT `dist/`)
- Static import pattern for bundled modules (see WindowScopedServiceFactory)

**Build Output**:
```
out/
  main/index.js          (bundled main process)
  preload/index.mjs      (bundled preload)
  renderer/              (React app)
    index.html
    assets/
```

**Key Pattern**: Static ES imports for modules (not dynamic requires at runtime). Rollup resolves all imports at build time, eliminating runtime filesystem lookups.

### Testing Setup

**Multi-Project Jest**:
1. **Main Process** (node environment):
   - Custom vite-env-transform for `import.meta.env`
   - Mocked: electron, chokidar
   - Setup: `tests/setup/main.ts`

2. **Renderer Process** (jsdom environment):
   - Module name mappers for path aliases
   - Setup: `tests/setup/polyfills.ts`, `tests/setup/renderer.ts`

**Coverage**: 50% minimum thresholds (branches, functions, lines, statements)

## Environment Requirements
- Node.js >= 22.0.0
- Yarn package manager (configured with .yarnrc.yml)

## Key Design Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| Service Container | `core/` | Dependency registry |
| Window Context | `core/` | Per-window service isolation |
| Factory | `WindowScopedServiceFactory` | Extensible service creation |
| IPC Module | `ipc/*.ts` | Self-registering handlers |
| Error Wrapper | `IpcErrorHandler` | Standardized error responses |
| Async Generator | Agents | Streaming results |
| Priority Queue | TaskExecutorService | Fair scheduling |
| Disposable | Services | Lifecycle management |
| EventBus | `core/` | Event broadcasting |
| AbortController | Pipeline/Tasks | Cancellation support |

## Code Style

- Do NOT create documentation markdown files (README.md, IMPLEMENTATION_SUMMARY.md, etc.) unless explicitly requested
- Use static imports (not dynamic requires) in main process
- Implement `Disposable` interface for services that need cleanup
- Use `EventBus` for main process events, not direct callbacks
- Window-scoped code must use `getWindowService()` to access context-specific services

## Architecture Decision Records

### Window Context Isolation (Recent)
**Problem**: All windows shared global WorkspaceService → data leakage
**Solution**: WindowContext + WindowScopedServiceFactory for per-window services
**Trade-off**: Slightly more complex initialization for complete isolation

### Static Imports in Service Factory (Recent)
**Problem**: Dynamic `require()` fails with bundled output (services inlined, not separate files)
**Solution**: Use static ES imports resolved at build time by Rollup
**Files**: `WindowScopedServiceFactory.ts`

### Two-Phase Bootstrap
**Problem**: Services need to be initialized before IPC modules can access them
**Solution**: `bootstrapServices()` then `bootstrapIpcModules()`
**Result**: Clean separation, each phase can fail independently