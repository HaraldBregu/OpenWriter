# Design Pattern Architect - Memory

## Codebase Architecture
- Electron + React 19 + TypeScript + Redux Toolkit + Redux Saga
- State split: Redux for document/async data; AppContext (useReducer) for UI state (theme, preferences, modals)
- AppContext uses split-context pattern (AppStateContext + AppActionsContext) for render optimization
- Path aliases: `@/` → `src/renderer/src/`, `@components/`, `@store/`, `@resources/`, etc.

## Key File Locations
- `src/renderer/src/App.tsx` — root router, provider tree
- `src/renderer/src/contexts/AppContext.tsx` — theme state, UI preferences, online status (useReducer)
- `src/renderer/src/hooks/useTheme.ts` — DOM class applicator + IPC + OS media query listeners
- `src/renderer/src/components/AppLayout.tsx` — calls useTheme(); wraps all routes EXCEPT WelcomePage
- `src/renderer/src/pages/WelcomePage.tsx` — standalone route at `/`, no AppLayout

## Confirmed Patterns Already in Use
- **Split Context** (AppContext): separate state/actions contexts to avoid unnecessary re-renders
- **Custom Hook as Facade** (useTheme, useLanguage, etc.): hooks encapsulate multi-concern side effects
- **Lazy Loading**: all pages except WelcomePage use React.lazy + Suspense
- **RouteWrapper**: ErrorBoundary + Suspense composition for route-level error handling

## Known Issues / Anti-Patterns
- `useTheme()` is called inside `AppLayout`, not at the provider level — causes theme not applied on WelcomePage
- Fix: move theme DOM side effect into AppProvider directly (see theme-pattern.md for full analysis)

## Team Preferences
- Functional React patterns (hooks, composition) preferred over class components
- No emojis in code or responses
- Absolute file paths required in all responses

## AI Settings Architecture (designed, not yet implemented)
- Shared types live in `src/shared/types/aiSettings.ts` — requires `@shared/` Vite alias
- `ProviderSettings` extends old `ModelSettings` with `temperature`, `maxTokens`, `reasoning`
- Redux slice: `src/renderer/src/store/aiSettingsSlice.ts` — loads on app start, mirrors Electron Store
- `loadAISettings` thunk dispatched once from AppLayout (or equivalent root effect)
- Hooks: `useAISettings` (global/ModelsSettings) and `useInferenceSettings(sectionId)` (personality pages)
- Section configs remain on disk (workspace-scoped), NOT in Redux — loaded per-mount via IPC
- Three-tier precedence in useInferenceSettings: section config > global Redux defaults > DEFAULT_INFERENCE_SETTINGS
- `DEFAULT_INFERENCE_SETTINGS` and `DEFAULT_PROVIDER_SETTINGS` defined only in `src/shared/types/aiSettings.ts`
- Old `ModelSettings` interface in `store.ts` → replaced by `ProviderSettings` import from shared types
- Migration: `migrateProviderSettings()` in StoreService fills missing fields from existing settings.json
- AppContext deliberately NOT used for AI settings — it is UI-only (theme, modals, preferences)

## Key File Locations (AI Settings)
- `src/main/services/store.ts` — StoreService, StoreSchema
- `src/main/ipc/StoreIpc.ts` — IPC channel registrations for store operations
- `src/main/shared/validators.ts` — StoreValidators class (input validation for IPC handlers)
- `src/preload/index.ts` + `src/preload/index.d.ts` — window.store bridge
- `src/renderer/src/pages/settings/ModelsSettings.tsx` — settings UI (currently uses local state + direct IPC)
- `src/renderer/src/components/personality/PersonalitySimpleLayout.tsx` — personality chat UI with inference settings
- `src/renderer/src/components/personality/PersonalitySettingsSheet.tsx` — inference settings panel component

## Main Process Architecture (confirmed)
- ServiceContainer: typed registry with Disposable lifecycle, NOT a full IoC container (intentional)
- EventBus: dual-mode — broadcast/sendTo for renderer IPC; emit/on for typed main-process events
- WindowFactory: Factory pattern for BrowserWindow creation with security defaults
- WindowContext/WindowContextManager: per-window service isolation (workspace, fileWatcher, etc.)
- IpcModule interface: self-registering modules, each calls ipcMain.handle internally
- IpcGateway: CQS (registerQuery/registerCommand) wrappers — same runtime behaviour, semantic signal only
- IpcErrorHandler: wrapIpcHandler/wrapSimpleHandler — uniform IpcResult<T> envelope for all IPC responses
- IpcHelpers: getWindowService() — routes IPC events to correct per-window ServiceContainer
- PipelineService: runs agent AsyncGenerators, broadcasts via EventBus; Chain of Responsibility for events
- TaskExecutorService: priority queue with concurrency limit + AbortController per task
- TaskHandlerRegistry / AgentRegistry: Registry pattern for pluggable handlers/agents
- bootstrap.ts: Composition Root — all service wiring in one place
- LifecycleService: single-callback design (onEvent) — can only have one listener; use EventBus instead

## Main Process Anti-Patterns / Issues Found
- **Critical DRY violation**: isReasoningModel, extractTokenFromChunk, classifyError defined 3x
  - In: ChatAgent.ts, EnhanceAgent.ts (pipeline/agents/), and aiHandlerUtils.ts (tasks/handlers/)
  - aiHandlerUtils.ts already contains the canonical versions; ChatAgent/EnhanceAgent don't import them
- **Duplicate window setup logic**: Main.create() vs Main.createWorkspaceWindow() repeat identical
  - event handler blocks: maximize, unmaximize, enter-full-screen, leave-full-screen, update-target-url
  - Should be extracted to a private `attachWindowEventHandlers(win)` method in Main
- **index.ts has business logic**: onNewWorkspace callback in menu construction (dialog + WorkspaceProcessManager spawn)
  - belongs in a WorkspaceProcessService or dedicated IPC handler
- **IpcGateway is a no-op abstraction**: registerQuery and registerCommand call identical code; the semantic
  distinction provides no enforcement — a command can be registered as a query without type error
- **LifecycleService.onEvent is a scalar**: only one listener supported; replace with EventBus subscription
- **StoreIpc exposes workspace channels that duplicate WorkspaceIpc**: store-get-current-workspace and
  workspace-get-current both exist; subtle semantic difference (global store vs window-scoped service)
  but confusing at the call site

## Links to Detail Files
- `theme-pattern.md` — full analysis of theme system pattern decision
- `main-process-patterns.md` — detailed pattern analysis of src/main/ (see analysis in conversation)
