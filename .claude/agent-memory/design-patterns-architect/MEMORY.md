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

## RAG Architecture (Feb 2026)
- `RagController` in `src/main/rag/RagController.ts` -- manages indexed files via `Map<string, IndexedFile>`, streams query tokens via IPC
- `ragLoader.ts` -- `indexFile()` reads fs, splits, embeds with OpenAI, returns `SimpleRetriever` (not exported, needs export for reuse)
- `ragChain.ts` -- LCEL chain: retriever | formatDocs -> prompt -> ChatOpenAI -> StringOutputParser
- `RagIpc.ts` -- thin IPC routing: `rag:index`, `rag:query`, `rag:cancel`, `rag:status`
- Preload: `ragIndex`, `ragQuery`, `ragCancel`, `ragGetStatus`, `onRagEvent`
- Renderer hook: `useRag.ts` -- local state (no Redux), streams via `onRagEvent` filtered by runId
- Existing `RagPage.tsx` -- two-phase UI (index file -> query chat)
- Extension pattern: add `indexDocuments()` to accept raw text instead of file path, use synthetic key in index Map

## File Links
- [architecture-refactoring-plan.md](./architecture-refactoring-plan.md) - Detailed refactoring plan for main process
