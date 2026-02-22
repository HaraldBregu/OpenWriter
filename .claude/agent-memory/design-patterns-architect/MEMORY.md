# Design Patterns Architect - Memory

## Project Architecture Overview
- Electron app with Main/Renderer/Preload architecture
- Main entry: `src/main/index.ts` (bootstrap) -> `src/main/main.ts` (Main class, ~700 LOC God Object)
- 12 services in `src/main/services/`: media-permissions, clipboard, dialogs, bluetooth, network, agent, lifecycle, filesystem, notification, cron, window-manager, store
- Controllers: `src/main/agent/AgentController.ts`, `src/main/rag/RagController.ts`
- Support files: `src/main/menu.ts`, `src/main/tray.ts`, `src/main/workspace.ts`, `src/main/i18n.ts`
- Preload: `src/preload/index.ts` (~600 LOC flat API object)

## Key Architectural Issues Identified (Feb 2026)
1. **God Object**: `Main` class in `main.ts` (~700 lines) owns all 12 services AND registers all IPC handlers in constructor
2. **IPC Registration Inconsistency**: Most IPC in Main constructor, but AgentService self-registers via `registerHandlers()`
3. **Duplicate IPC Registration**: `workspace:select-folder` registered in both `Main` constructor AND `WorkspaceSelector` constructor
4. **No Dependency Injection**: Services instantiated directly in Main constructor with `new`
5. **Broadcasting Pattern Repeated**: `BrowserWindow.getAllWindows().forEach(win => win.webContents.send(...))` duplicated 6+ times
6. **Window Config Duplication**: BrowserWindow config copied between `create()` and `createWindowForFile()`
7. **Type Safety Gap**: `(app as { isQuitting?: boolean }).isQuitting` cast used 4 times across files
8. **Single Callback Limitation**: Services use single callback pattern (`onEvent`, `onJobResult`) - only one listener supported
9. **No Service Lifecycle Management**: No cleanup/destroy coordination on app shutdown
10. **StoreService Multiple Instances**: Created in both `index.ts` and `Main` constructor

## Tech Stack
- React 19, TypeScript, Redux Toolkit + Saga, TipTap, Radix UI, Tailwind
- Build: Electron-Vite, Node >= 22
- AI: LangChain (OpenAI), RAG pipeline
- Custom file format: `.tsrct`

## Pipeline Architecture (Feb 2026)
- `src/main/pipeline/` module: AgentBase (interface+types), AgentRegistry, PipelineService, agents/EchoAgent
- Pattern: Agent interface yields `AsyncGenerator<AgentEvent>`, PipelineService drives the generator and forwards events via EventBus
- IPC: single `pipeline:event` channel carries all event types (token/thinking/done/error) as `{ type, data }` objects
- Renderer hook: `src/renderer/src/hooks/usePipeline.ts` accumulates tokens, filters by runId
- Adding a new agent: implement Agent interface + register in bootstrap.ts (2 lines)
- PipelineService implements Disposable for graceful shutdown
- `wrapIpcHandler` returns `{ success, data }` envelope -- renderer must unwrap

## Known Lint Issues
- ESLint config does not respect `_` prefix for unused params; `_eventBus` in IpcModules triggers @typescript-eslint/no-unused-vars (pre-existing in StoreIpc, PipelineIpc, etc.)
- `src/renderer/src/utils/ipc-helpers.ts` imports from `src/main/` causing TS6307 in tsconfig.web.json (pre-existing)

## Workspace Metadata (.tsrct) Feature (Feb 2026)
- `WorkspaceMetadataService` in `src/main/services/workspace-metadata.ts` manages `.tsrct` file
- Pattern: Repository (encapsulates file I/O) + Observer (EventBus for changes)
- Debounced writes (800ms) via `scheduleSave()` / `flush()` pattern
- Validates directories: existence, is-directory, read permission, symlink-aware duplicate detection
- `DirectoriesIpc` in `src/main/ipc/DirectoriesIpc.ts` - thin IPC routing layer
- Redux: `directoriesSlice.ts` with loading/error states, selectors for indexed/pending counts
- Renderer pages use relative imports (`'../store'`), NOT alias imports (`'@store/'`)
- Service registered as `'workspaceMetadata'` in ServiceContainer

## Brain LLM Integration Design (Feb 2026)
- 5 brain pages: Consciousness, Reasoning, Memory, Perception, Principles (all in `src/renderer/src/pages/brain/`)
- **LlmProvider Strategy**: `src/main/llm/` -- LlmProvider interface, LlmProviderRegistry, providers/ (OpenAi, Anthropic)
- **BrainAgent**: Single parameterized agent class registered 5x with different names (brain:reasoning, brain:memory, etc.)
- **BrainChat Compound Component**: `src/renderer/src/components/brain/` -- context provider wrapping usePipeline + conversation history
- **Command Pattern**: PromptCommand objects for history/replay, usePromptHistory hook, prompt templates per domain
- Key principle: reuse existing pipeline infrastructure, do NOT build parallel systems

## Brain Files Persistence Design (Feb 2026)
- Pattern follows PostsIpc: IPC module with CRUD, Redux slice, renderer hook
- File format: Markdown with YAML frontmatter (not JSON -- conversations are text-first)
- Workspace path: `<workspace>/brain/<section>/<id>.md` (5 section subdirs)
- Lazy loading: `brain:load-all` returns metadata only, `brain:get` loads full content
- No dedicated service -- logic in BrainFilesIpc (simple CRUD, no complex business rules)
- No file watcher -- write-once-read-many pattern, external edits are edge case
- Per-section `isSaving` state in Redux for multi-window safety
- Key files: BrainFilesIpc.ts, brainFilesSlice.ts, useBrainFiles.ts
- Brain pages use `useAI` hook (not usePipeline directly) with `AIMessage` type

## File Links
- [architecture-refactoring-plan.md](./architecture-refactoring-plan.md) - Detailed refactoring plan for main process
