# Source Architecture Guide

## Purpose

`src/` is the runtime boundary map for OpenWriter.

This level is where the application is split by process, trust level, and state ownership.
If you are trying to understand how data moves through the product, start here before diving into the subsystem guides under `src/main/ai` and `src/main/task`.

This guide explains:

- the top-level architecture under `src/`
- which layer owns which responsibilities
- how data flows from renderer interaction to main-process side effects
- how state is split between Redux, React context, task streams, and main-process services
- where new features should be added without breaking process boundaries

## Top-Level Structure

```text
src/
  AGENTS.md
  main/
  preload/
  renderer/
  shared/
```

### `src/main/`

This is the privileged Electron and Node.js runtime.

It owns:

- application bootstrap
- window creation and lifecycle
- IPC handler registration
- filesystem access
- workspace services and watchers
- background task execution
- AI agent execution and indexing
- server-side persistence and logging

Use this layer for anything that requires Electron APIs, Node APIs, filesystem access, or trusted orchestration.

### `src/preload/`

This is the security boundary between `main` and `renderer`.

It owns:

- the typed `contextBridge` API
- strongly typed `invoke`, `send`, and `on` wrappers
- narrowing the renderer to approved capabilities only

This layer should stay thin.
It translates IPC contracts into ergonomic browser-safe APIs like `window.workspace`, `window.task`, `window.app`, and `window.win`.

### `src/renderer/`

This is the React application.

It owns:

- routes and page composition
- UI state and interaction logic
- Redux state for workspace and document collections
- page-local state for the editor screen
- subscriptions to preload-exposed events
- presentation of task progress and streamed AI output

This layer should not perform trusted filesystem or Electron work directly.

### `src/shared/`

This is the cross-process contract layer.

It owns:

- shared IPC channel constants
- shared DTOs and event types
- provider defaults and shared constants

Anything in this folder must remain process-neutral.
Do not import Electron, React, DOM APIs, or Node-only code here.

## Architectural Rule

The boundary is intentionally one-directional:

1. `renderer` asks for work through preload APIs.
2. `preload` forwards those calls to IPC.
3. `main` validates, executes, and emits results.
4. `preload` forwards events back to the renderer.
5. `renderer` updates UI state from those results.

Do not bypass this flow.
If renderer code needs new capability, add it to:

1. `src/shared/channels.ts` and shared types
2. the relevant IPC module in `src/main/ipc`
3. `src/preload/index.ts`
4. the renderer caller

## Boot Sequence

The current application boot path is centered on these entrypoints:

- `src/main/index.ts`
- `src/main/bootstrap.ts`
- `src/preload/index.ts`
- `src/renderer/src/App.tsx`

### Main-process startup

`src/main/index.ts` is the Electron entrypoint.

It is responsible for:

- registering the `local-resource://` protocol early
- determining launcher mode versus isolated workspace mode
- calling `bootstrapServices()`
- calling `bootstrapIpcModules(...)`
- wiring lifecycle logging and cleanup
- creating the tray, menu, and main/workspace windows

### Main-process service bootstrap

`src/main/bootstrap.ts` builds the server-side runtime graph.

It currently registers:

- `ServiceContainer`
- `EventBus`
- `AppState`
- `WindowFactory`
- `WindowContextManager`
- persistent store services
- logger and file-management services
- AI agent registry
- task handler registry and task executor
- task reaction registry and reaction bus
- extractor registry for indexing
- IPC modules

This file is the best single place to understand how the main process is assembled.

### Preload bootstrap

`src/preload/index.ts` exposes the typed bridge.

The major namespaces are:

- `window.app`
- `window.win`
- `window.workspace`
- `window.task`

This file is intentionally transport-oriented.
Business rules should not accumulate here.

### Renderer bootstrap

`src/renderer/src/App.tsx` is the renderer entrypoint.

It currently does three important things before route rendering:

- initializes the task event store
- subscribes to output file changes and syncs Redux documents state
- subscribes to resource file changes and syncs Redux workspace state

That means the renderer is not polling for most changes.
It is event-driven from preload IPC subscriptions.

## Main Data Flows

### 1. Workspace and resources flow

This is the standard filesystem-backed flow:

1. A renderer action calls `window.workspace.*`.
2. Preload forwards that call through the typed IPC layer.
3. A main-process IPC module routes the request to a workspace or file service.
4. The service writes to disk, updates metadata, or mutates the current workspace context.
5. File watchers or explicit events emit change notifications.
6. Preload forwards those events back to the renderer.
7. Redux actions reload or patch the affected lists.

Examples:

- loading imported resources
- reacting to resource deletion
- reacting to output document file changes
- opening the workspace or document folder

### 2. Document editing flow

The document page has a mixed state model.

The high-level flow is:

1. Route `/content/:id` mounts `src/renderer/src/pages/document/Page.tsx`.
2. That page composes document-specific providers:
   - `DocumentProvider`
   - `ChatProvider`
   - `SidebarVisibilityProvider`
   - `EditorInstanceProvider`
3. `Layout.tsx` loads the current document content and metadata.
4. The editor updates page-local document state as the user types.
5. Debounced persistence hooks save document output and history snapshots through `window.workspace`.
6. Filesystem changes propagate back through output watchers.
7. Redux document collections and header/history UI stay synchronized with disk state.

Important distinction:

- the editor screen does not rely on Redux for every local interaction
- document-local reducer/context state is used for active editing concerns
- Redux holds the broader collection-level view of workspace documents

### 3. Task execution flow

Background work moves through the task subsystem:

1. Renderer submits a task through `window.task.submit(...)`.
2. Preload invokes `task:submit`.
3. `TaskManagerIpc` forwards the request to `TaskExecutor`.
4. `TaskExecutor` resolves the appropriate registered handler.
5. The handler runs, optionally streaming progress and partial output.
6. Task lifecycle events are emitted onto the main-process event bus.
7. Preload forwards task events to the renderer.
8. `src/renderer/src/services/task-store.ts` updates the tracked task store.
9. Debug or product UI reads that derived task state.

This task layer is the bridge between UI intent and long-running main-process work.

### 4. AI inference flow

AI work is just a specialized task flow.

The current shape is:

1. Renderer submits an agent task.
2. The task subsystem resolves an `AgentTaskHandler`.
3. The handler resolves the target agent definition from `src/main/ai`.
4. Provider/model settings are resolved server-side.
5. The agent graph or streaming executor runs.
6. Tokens, progress updates, and final results are streamed back as task events.
7. Renderer reads those events through the task store and document/chat UI.

For the agent layer itself, see `src/main/ai/AGENTS.md`.

### 5. Indexing and retrieval preparation flow

Indexing is also executed as a task.

The current path is:

1. Renderer starts an indexing task.
2. Main resolves `IndexResourcesTaskHandler`.
3. The handler loads tracked resources from the current workspace.
4. File-type-specific extractors read text.
5. Text is chunked and embedded.
6. The JSON vector store and indexing manifest are written to disk.
7. Progress is emitted through task events.
8. Renderer updates indexing-related UI from those events and follow-up reads.

For the AI/indexing details, see `src/main/ai/AGENTS.md`.

## State Management

OpenWriter does not use a single global state model.
State is deliberately split by process and lifetime.

### Main-process state

Main-process state is authoritative for trusted runtime concerns.

Examples:

- current workspace binding
- per-window service instances
- file watcher registration
- registered IPC modules
- agent registry
- task queue state
- active task metadata
- indexing artifacts and manifests

This state lives in services, registries, and executors, not in Redux.

### Renderer Redux state

Redux is currently used for cross-page renderer state that benefits from a central store.

The configured slices are:

- `workspace`
- `documents`

`src/renderer/src/store/index.ts` wires these slices together and prepends listener middleware.

Use Redux here for:

- workspace resource collections
- loaded document collections
- app-wide list synchronization
- event-driven collection refreshes

Do not use Redux by default for editor-local transient state.

### Renderer document-page context state

The document page maintains its own reducer-backed context state under `src/renderer/src/pages/document/context`.

This local state currently owns concerns such as:

- current document id
- loaded title and content
- metadata loaded for the open document
- sidebar visibility
- chat session state
- editor instance coordination
- page-local loading and trashing flags

This is intentionally scoped to the open document screen.
It prevents the global store from becoming a dumping ground for editor-only state.

### Renderer task event state

Task UI state is not Redux-managed right now.

`src/renderer/src/services/task-store.ts` maintains an event-driven in-memory task registry that:

- subscribes once to `window.task.onEvent`
- hydrates active tasks from `window.task.list()`
- accumulates lifecycle and stream events
- exposes subscription hooks for task-oriented UI

Treat this as a specialized client-side projection of the main task executor.

### Local component state

Use React local state for strictly ephemeral UI concerns such as:

- popovers
- hover state
- input drafts that are not shared
- temporary selection UI
- transient animation flags

If the state does not need to survive route transitions, process boundaries, or cross-component coordination, keep it local.

## IPC Contract Model

The IPC contract is defined from `src/shared`, not ad hoc in random handlers.

The two primary files are:

- `src/shared/channels.ts`
- `src/shared/types.ts`

### `src/shared/channels.ts`

This file is the canonical channel registry.

It defines grouped channel namespaces such as:

- `WorkspaceChannels`
- `WindowChannels`
- `TaskChannels`
- `ResearcherChannels`
- `AppChannels`

It also describes invoke/send event shapes through typed maps.

### `src/shared/types.ts`

This file contains the payloads flowing over IPC.

Examples:

- `TaskEvent`
- `TaskInfo`
- `OutputFile`
- `ResourceInfo`
- `DirectoryEntry`
- watcher event payloads

When the renderer and main process disagree about data shape, this file should be treated as the source of truth.

## Folder Responsibilities Inside `src/main`

### `src/main/core`

Core infrastructure:

- dependency container
- event bus
- window factory
- application state
- window context management

### `src/main/ipc`

IPC modules that register handlers for each exposed capability.

These modules should:

- validate and route requests
- resolve services from the container or window context
- remain thin compared to the underlying service layer

### `src/main/workspace`

Workspace-specific business logic and persistence.

This layer owns filesystem-backed project behavior, metadata, output files, and watcher-aware document/resource operations.

### `src/main/services`

Cross-cutting process services such as persistent store and logging.

### `src/main/shared`

Main-process-only shared utilities and abstractions that do not belong in cross-process `src/shared`.

### `src/main/task`

Background execution, queueing, priorities, cancellation, reactions, and streaming task lifecycle.

See `src/main/task/AGENTS.md`.

### `src/main/ai`

Agent definitions, AI execution infrastructure, and indexing/RAG preparation primitives.

See `src/main/ai/AGENTS.md`.

## Folder Responsibilities Inside `src/renderer/src`

### `components/`

Reusable UI elements and editor-facing components.

### `pages/`

Route-level features and page-local architecture.
Use the current page tree as the reference structure for new route work.
The document screen is the canonical full feature area with its own hooks, context, components, providers, services, and panels.

## Current Renderer Page Structure

The current `src/renderer/src/pages` tree is the best reference for how route code should be organized:

```text
src/renderer/src/pages/
  WelcomePage.tsx
  HomePage.tsx
  agents/
    AgentsPage.tsx
  debug/
    DebugPage.tsx
    DebugReduxPage.tsx
    DebugTasksPage.tsx
    LogPanel.tsx
    ProgressBar.tsx
    ReduxStateTab.tsx
    SliceSection.tsx
    StatusBadge.tsx
    TaskRow.tsx
    TasksTab.tsx
    debug-constants.ts
    debug-helpers.ts
  document/
    AGENTS.md
    Page.tsx
    Layout.tsx
    Header.tsx
    components/
      HistoryMenu.tsx
    context/
      actions.ts
      index.ts
      reducer.ts
      state.ts
    hooks/
      index.ts
      use-chat-persistence.ts
      use-document-actions.ts
      use-document-dispatch.ts
      use-document-history.ts
      use-document-persistence.ts
      use-document-state.ts
      use-document-ui.ts
    panels/
      chat/
        Provider.tsx
        index.tsx
        components/
          Header.tsx
          Input.tsx
          Message.tsx
          index.ts
        context/
          actions.ts
          contexts.tsx
          index.ts
          reducer.ts
          state.ts
        hooks/
          index.ts
          use-chat-dispatch.ts
          use-chat-state.ts
      resources/
        ResourcesPanel.tsx
        components/
        context/
        hooks/
    providers/
      Document.tsx
      Editor.tsx
      Sidebar.tsx
      index.ts
    services/
      chat-session-storage.ts
      history-service.ts
  models/
  resources/
    ResourcePreviewSheet.tsx
    ResourcesEmptyState.tsx
    ResourcesHeader.tsx
    ResourcesPage.tsx
    ResourcesTable.tsx
    constants.ts
  settings/
    AgentsSettingsPage.tsx
    CollapsibleSection.tsx
    GeneralSettingsPage.tsx
    LanguageSelector.tsx
    ProvidersSettingsPage.tsx
    SettingsComponents.tsx
    SettingsLayout.tsx
    SystemSettingsPage.tsx
    ThemeModeSelector.tsx
    WorkspacePage.tsx
```

Apply these conventions when adding or moving page code:

- small routes can stay as a single `*Page.tsx` file or a shallow feature folder
- complex routes should follow `src/renderer/src/pages/document` as the reference shape
- keep route-specific `components`, `hooks`, `context`, `providers`, `services`, and `panels` inside the feature folder before promoting anything to shared renderer directories
- use `Page.tsx` as the route entry and `Layout.tsx` as the feature orchestrator when the screen is large enough to need both
- keep page-only helpers close to the route instead of placing them in global `hooks/` or `services/` too early

### `store/`

Redux slices, selectors, actions, reducers, and listener middleware.

### `services/`

Renderer-only service abstractions that are not plain components or hooks, such as the task event store.

### `contexts/`

Cross-app renderer providers that sit above individual pages.

### `hooks/`

Shared renderer hooks that do not belong to one specific page feature folder.

## Document-Related Ownership Across `src/`

Several folders use the word "document", but they do not own the same thing.
Keep these responsibilities distinct:

```text
src/main/workspace/
  documents.ts
  documents-watcher.ts
  output-files.ts

src/renderer/src/store/documents/
  actions.ts
  index.ts
  reducer.ts
  selectors.ts
  state.ts
  types.ts

src/renderer/src/pages/document/
  Page.tsx
  Layout.tsx
  Header.tsx
  ...
```

Ownership is currently split like this:

- `src/main/workspace/documents.ts` manages imported workspace files stored under `<workspace>/resources`
- `src/main/workspace/output-files.ts` manages editable output entries stored under `<workspace>/output/documents`
- `src/renderer/src/store/documents` is the Redux collection view of those output entries
- `src/renderer/src/pages/document` is the route UI for one output document at `/content/:id`

Do not treat imported workspace resources and editable output documents as the same subsystem.

## Design Constraints

### Keep trust boundaries intact

- `renderer` must not import Node or Electron primitives
- `shared` must remain environment-neutral
- privileged logic belongs in `main`
- preload should expose minimal capability, not full internals

### Keep state close to its owner

- disk-backed truth belongs in `main`
- collection-level client state belongs in Redux
- page-scoped editor state belongs in document context/providers
- ephemeral UI state belongs in local component state

### Prefer event-driven synchronization

The current architecture already relies on watchers and task events.
Prefer emitting or subscribing to those channels instead of adding renderer polling loops.

### Add APIs contract-first

When adding new capability:

1. add or update shared channel/type definitions
2. implement the main IPC module handler
3. expose the capability in preload
4. consume it in renderer
5. add tests on the layer where logic changed

## Common Mistakes To Avoid

- putting renderer-only UI concerns into the main process
- storing editor-local state in Redux without a cross-screen reason
- importing main-process helpers into `src/shared`
- adding business logic into preload instead of main services
- bypassing task streaming and inventing parallel ad hoc background channels
- treating file watchers as optional when the UI needs to stay aligned with disk

## Where To Start When Debugging

If the bug is mainly about:

- startup or window lifecycle: start with `src/main/index.ts` and `src/main/bootstrap.ts`
- bridge/API exposure: start with `src/preload/index.ts` and `src/shared/channels.ts`
- global renderer collections: start with `src/renderer/src/store`
- document editing behavior: start with `src/renderer/src/pages/document`
- task queueing or progress: start with `src/main/task` and `src/renderer/src/services/task-store.ts`
- AI execution or indexing: start with `src/main/ai`

## Related Guides

- `src/main/ai/AGENTS.md`
- `src/main/task/AGENTS.md`

This file should stay focused on application-wide architecture.
Subsystem-specific execution details belong in their local guides.
