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

## File Links
- [architecture-refactoring-plan.md](./architecture-refactoring-plan.md) - Detailed refactoring plan for main process
