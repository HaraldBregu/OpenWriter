# Document Page Guide

## Purpose

`src/renderer/src/pages/document` is the renderer feature area for editing a single document.

This folder owns the document screen shown at route `/content/:id`.
It combines:

- the page shell and panel layout
- the editor integration
- document save and restore behavior
- document-local version history
- the right sidebar panels
- the agentic chat panel
- image uploads for the current document
- document-scoped context state and persistence helpers

This folder is not the generic editor implementation itself.
The TipTap-based editor lives under `src/renderer/src/components/editor`.
This folder is the orchestration layer that wires that editor into the document feature.

## Current Structure

```text
src/renderer/src/pages/document/
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
  providers/
    Document.tsx
    Editor.tsx
    Sidebar.tsx
    index.ts
  hooks/
    index.ts
    use-document-actions.ts
    use-document-dispatch.ts
    use-document-history.ts
    use-document-persistence.ts
    use-document-state.ts
    use-document-ui.ts
  services/
    chat-session-storage.ts
    history-service.ts
  panels/
    chat/
      index.tsx
      Provider.tsx
      components/
        Header.tsx
        Input.tsx
        Message.tsx
        index.ts
      context/
        actions.ts
        contexts.ts
        index.ts
        reducer.ts
        state.ts
      hooks/
        index.ts
        use-chat-dispatch.ts
        use-chat-state.ts
    resources/
      ResourcesPanel.tsx
```

## Entry Points

### `Page.tsx`

This is the route entry.

It reads the `id` param from React Router and mounts the provider stack for one document session:

- `DocumentProvider`
- `SidebarVisibilityProvider`
- `EditorInstanceProvider`

Then it renders `Layout`.

Important detail:

- `DocumentProvider` is keyed by `id`
- switching to a different document causes the document-scoped provider tree to reset cleanly

### `Layout.tsx`

This is the real feature orchestrator.

Most of the runtime behavior currently lives here:

- loading document content
- loading metadata and images
- subscribing to file watcher events
- debounced saving
- history restore wiring
- editor task streaming
- panel composition

If you are debugging behavior on the document page, start here first.

## High-Level Runtime Flow

The current page flow is:

1. Router mounts `Page.tsx` for `/content/:id`.
2. `Page.tsx` creates the document-scoped providers.
3. `Layout.tsx` loads the current document output from `window.workspace.loadOutput(...)`.
4. `Layout.tsx` stores the active `title`, `content`, `loaded`, and trash state in local React state.
5. `Layout.tsx` loads images for the document and subscribes to output/image watcher events.
6. `Header` exposes rename, search, undo, redo, history restore, sidebar toggles, and trash/open-folder actions.
7. `Layout.tsx` mounts `TextEditor` directly with the current content and editor callbacks.
8. Typing updates local page state and triggers a debounced document save.
9. `useDocumentHistory(...)` creates debounced history snapshots and supports undo/redo/history restore.
10. The right panel renders either:
    - `panels/resources/ResourcesPanel.tsx` for metadata/images/actions
    - `panels/chat/index.tsx` for agentic chat
11. Editor tasks are submitted through `useTask(...)` in `Layout.tsx` and streamed back through the renderer task event bus.
12. Chat tasks are submitted and observed inside `panels/chat/index.tsx`.
13. Watchers keep metadata, images, and history menu state synchronized with disk.

## Component Responsibilities

### `Header.tsx`

This is the document page header.

It is responsible for:

- document title input
- inline search open/close and Ctrl/Cmd+F binding
- undo and redo buttons
- version history menu
- toggle buttons for the right sidebar modes
- overflow menu actions like open folder and move to trash

It is intentionally stateless relative to document persistence.
`Layout.tsx` owns the handlers and passes state down.

### `panels/chat/index.tsx`

This is the agentic sidebar UI.

It is responsible for:

- rendering the current chat messages
- creating a new session id when a conversation starts
- loading the latest persisted session for the current document
- persisting session changes back to disk
- appending user and placeholder assistant messages
- binding the active task id to the active assistant message
- selecting between the `researcher` and `inventor` agents
- submitting chat tasks through `window.task.submit(...)`
- initializing task metadata for the event bus
- subscribing to task snapshots for the active chat task
- inserting system status messages derived from task metadata
- patching the active assistant message as the task progresses
- clearing the active task/message binding on terminal states

Chat-specific task orchestration lives here now.
`Layout.tsx` still owns editor-related task orchestration.

### `ResourcesPanel.tsx`

This is the non-agentic right sidebar.

It reads document metadata and image state from document context and renders:

- document info
- image thumbnails
- image upload affordances
- placeholder export/share/action sections

Image upload flow:

1. user picks one or more images
2. file is read as a data URI in the renderer
3. the base64 payload is sent through `window.workspace.saveDocumentImage(...)`
4. the panel refreshes images immediately when possible
5. file watcher events act as a second sync path

### `components/HistoryMenu.tsx`

This is the header dropdown for history snapshots.

It is a pure UI wrapper over `HistoryEntry[]`.
It does not read from disk itself.

## State Ownership

This feature uses a mixed state model.
That is important to understand before changing anything.

### 1. `Layout.tsx` local state

The current source of truth for active editing state is local to `Layout.tsx`.

Local state currently owns:

- `title`
- `content`
- `loaded`
- `isTrashing`
- `editorExternalValueVersion`

This means the open document's main editable data is not currently reducer-driven.

### 2. `DocumentContext`

`DocumentContext` is a reducer-backed document feature store, but it is not currently the sole source of truth for the open editor state.

Its `DocumentState` shape contains:

- `documentId`
- `title`
- `content`
- `metadata`
- `images`
- `loaded`
- `isTrashing`
- `sidebarOpen`
- `agenticSidebarOpen`
- `chatSessions`
- `chat`

In the current implementation, this context is used primarily for:

- route-scoped document identity
- metadata updates
- image lists
- stored chat session summaries
- the chat slice itself, via `state.chat`

Important nuance:

- `DocumentState` includes `title`, `content`, and `loaded`
- the current `Layout.tsx` flow keeps those values in local component state instead of reading/writing them through the document reducer

So this folder currently contains both:

- the active `Layout`-driven implementation
- reusable reducer/hook abstractions that model a more reducer-centric document flow

Do not assume every exported hook is part of the current hot path.

### 3. `ChatProvider`

`panels/chat/Provider.tsx` is mounted only by the chat panel.
It does not own an independent store. It exposes a chat-scoped view over `DocumentContext`, using `documentState.chat` and the shared document dispatch.

The React contexts live in `panels/chat/context/contexts.ts`.
The chat hooks live in `panels/chat/hooks/`.

`ChatSession` contains:

- `sessionId`
- `messages`
- `activeTaskId`
- `activeMessageId`

Use this context for:

- current visible conversation
- which assistant message is being streamed into
- which task is currently bound to that message

### 4. `SidebarVisibilityProvider`

This owns which right sidebar is open.

Current values:

- `config`
- `agentic`
- `editor`
- `null`

In practice the document page currently uses:

- `config`
- `agentic`
- `null`

It also tracks whether panel transitions should animate when switching versus opening/closing.

### 5. `EditorInstanceProvider`

This stores the live TipTap `Editor` instance so document-scoped code can access it without prop drilling.

### 6. Service-backed state on disk

Some document page state is persisted outside React:

- document output content and metadata
- history snapshots under the document folder
- chat sessions under the document folder
- document images under the document folder

The UI is event-driven against those files through `window.workspace` watcher events.

## Current Source of Truth by Concern

Use this map when making changes:

- active editor content: `Layout.tsx` local state
- active title: `Layout.tsx` local state
- current document id: `DocumentContext`
- metadata sidebar info: `DocumentContext`
- image list: `DocumentContext`
- visible chat messages: `DocumentContext.chat`, consumed through the chat panel's local `ChatProvider`
- visible chat session id: `DocumentContext.chat`, consumed through the chat panel's local `ChatProvider`
- list of saved chat sessions: `DocumentContext.chatSessions`
- active sidebar mode: `SidebarVisibilityProvider`
- live editor instance: `EditorInstanceProvider`
- persisted document file: `window.workspace` output APIs
- persisted history snapshots: `services/history-service.ts`
- persisted chat sessions: `services/chat-session-storage.ts` plus `panels/chat/index.tsx`

## Persistence and Disk Flow

### Document save flow

`Layout.tsx` creates a debounced save using `lodash/debounce`.

Current behavior:

- delay: `1500ms`
- save target: `window.workspace.updateOutput({ type: 'documents', ... })`
- save trigger: title change, content change, and history restore
- unmount behavior: pending save is flushed before cancellation

This protects recent edits when the page unmounts shortly after typing.

### History snapshot flow

`use-document-history.ts` is responsible for document version history.

Current behavior:

- debounced snapshot delay: `1500ms`
- snapshot files are saved under `{docPath}/history`
- max retained entries: `12`
- history list reloads when output watcher events indicate history file changes
- pending snapshot writes are flushed on unmount

Undo/redo model:

- history snapshots are file-backed
- `currentEntryId` tracks which saved snapshot is currently being viewed
- `liveDraftRef` keeps the unsaved live editor state while browsing history
- undo moves backward through saved entries
- redo moves forward or returns to the saved live draft

Restore model:

- restoring a history entry calls `onRestore(...)`
- `Layout.tsx` increments `editorExternalValueVersion`
- `TextEditor` receives a forced external update instead of relying only on the value prop

That forced external value version is important.
Without it, the editor can miss history restores because the internal editor state does not fully reset from a plain prop equality path.

### Chat session persistence flow

`panels/chat/index.tsx` persists the agentic sidebar conversation per document.

Storage layout:

```text
{docPath}/chats/{sessionId}/messages.json
```

Key behaviors:

- session ids are UUID v7
- session timestamps are derived from the UUID when possible
- the hook loads the most recent session when a document opens
- the hook scans `chats/` rather than relying on a separate index file
- messages in in-progress states are sanitized to `error` on reload so interrupted sessions are not shown as still running
- writes are debounced
- new sessions are prepended into the document context session list after first save

Supporting utilities in `services/chat-session-storage.ts` handle:

- scanning session folders
- reading `messages.json`
- building `ChatSessionListItem[]`
- deriving titles from the first user message
- relative age labels like `now`, `5m`, `2h`

## File Watchers and Synchronization

This feature depends on file watcher events from the preload bridge.

### Output watcher usage

`Layout.tsx` subscribes to `window.workspace.onOutputFileChange(...)` to:

- refresh metadata when the current document file changes
- refresh images when output changes may imply image changes

`use-document-history.ts` also listens to output file change events for the current document and reloads history entries when the changed path points into the `history/` directory.

### Image watcher usage

`Layout.tsx` subscribes to `window.workspace.onDocumentImageChange(...)` to refresh the image list.

These watcher subscriptions are what keep:

- the header history menu
- the resources panel image grid
- metadata display

aligned with disk mutations.

## AI and Task Integration

This page integrates several task-backed capabilities through two paths:

- `Layout.tsx` uses `useTask(...)` for editor-facing workflows
- `panels/chat/index.tsx` uses `window.task.submit(...)` plus `subscribeToTask(...)` for chat

Current task types used here:

- `agent-text-completer`
- `agent-text-enhance`
- `agent-text-writer`
- `agent-image-generator`
- `agent-researcher`
- `agent-text-writer` again for the `inventor` chat path

### Task hook layer

`useTask(...)` is the renderer-facing hook that:

- submits tasks through `window.task.submit(...)`
- stores task id and local status
- subscribes to task snapshots through `task-event-bus`
- exposes booleans like `isQueued`, `isRunning`, `isCompleted`

This hook is used for editor workflows in `Layout.tsx`, not for chat submission.

### Task event bus layer

`src/renderer/src/services/task-event-bus.ts` provides a singleton event router over `window.task.onEvent(...)`.

This page uses `subscribeToTask(taskId, cb)` so each document workflow can react to its own task stream without creating separate IPC subscriptions.

### Editor task flows

`Layout.tsx` subscribes to task snapshots and mutates the editor imperatively through `editorRef`.

Current flows:

- text completer:
  streamed text is inserted directly into the editor

- text enhance:
  selected text range is deleted on start
  streamed replacement text is inserted as it arrives

- text writer:
  streamed content is buffered and interpreted as markdown-ish structure
  heading/list markers are converted into editor commands
  text is inserted incrementally

- image generator:
  final JSON result is parsed for `imageUrl` and `revisedPrompt`
  generated image is inserted into the editor

These flows are tightly coupled to imperative methods exposed by `TextEditorElement`.

### Chat task flow

Chat submission and streaming are handled directly inside `panels/chat/index.tsx`.

The current flow is:

1. `panels/chat/index.tsx` dispatches local user and placeholder assistant messages.
2. `panels/chat/index.tsx` submits the selected task with document-scoped metadata.
3. `panels/chat/index.tsx` stores the resolved task id on the active assistant message.
4. `panels/chat/index.tsx` subscribes to the active task id through `subscribeToTask(...)`.
5. task snapshots are filtered by `metadata.documentId` when present.
6. `getTaskStatusText(...)` is used to derive system status rows that are inserted before the active assistant reply.
7. assistant message content and status are patched in chat context as the task progresses.
8. completion/error/cancellation clears the active task and active message ids.

This keeps chat transport and chat rendering concerns inside the chat panel area rather than in `Layout.tsx`.

## Important Services

### `services/history-service.ts`

This is the disk helper for document history.

It defines:

- `HISTORY_DIR_NAME`
- `MAX_HISTORY_ENTRIES`
- `HistoryEntry`
- `saveHistorySnapshot(...)`
- `listHistoryEntries(...)`
- `loadHistoryEntry(...)`
- `isHistoryEntryFilePath(...)`

This service is intentionally dumb.
It does file operations and serialization only.
Selection state, undo/redo logic, and live-draft handling belong in `use-document-history.ts`.

### `services/chat-session-storage.ts`

This is the discovery and formatting helper for chat sessions on disk.

It does not own React state.
It only:

- scans folders
- reads files
- derives titles and relative timestamps
- returns normalized data for hooks/contexts

## Hooks

### Hooks actively used in the current `Page` + `Layout` flow

- `useDocumentHistory`
- `useDocumentDispatch`

Chat persistence is part of `panels/chat/index.tsx` now rather than a standalone shared hook.

### Hooks that expose document-context abstractions

- `useDocumentState`
- `useDocumentPersistence`
- `useDocumentActions`
- `useDocumentUI`

Important note:

- some of these hooks model a more reducer-centric document page than the current `Layout.tsx` implementation uses directly
- before refactoring, decide whether you are extending the current local-state orchestration or moving the feature back toward reducer-driven state

Do not mix both approaches casually.

## Why `externalValueVersion` Exists

The editor is not a plain controlled `<textarea>`.
It is a rich text editor with internal state.

When restoring history, the page must force a true external sync into `TextEditor`.
That is what `editorExternalValueVersion` is for.

Current restore flow:

1. load history entry from disk
2. call `handleHistoryRestore(...)`
3. increment `editorExternalValueVersion`
4. update `content` and `title`
5. trigger a debounced save

If you remove this version bump, history selection can stop updating the visible editor content even though React state changed.

## Common Modification Paths

### Add a new header action

Update:

- `Header.tsx` for the button or menu item
- `Layout.tsx` for the behavior

If the action is disk-backed, prefer using existing `window.workspace` APIs or extending the IPC contract cleanly.

### Add a new right sidebar mode

Update:

- `providers/Sidebar.tsx`
- `Header.tsx`
- `Layout.tsx`

Keep the panel itself in a dedicated component rather than growing `Layout.tsx` further.

### Add a new document-scoped task workflow

Update:

- `Layout.tsx` for editor-related submission and subscription wiring
- `panels/chat/index.tsx` for chat-related submission and subscription wiring

Prefer keeping:

- editor task submission in `Layout`
- chat task submission in `ChatPanel`
- rendering in child panels
- disk helpers in `services/`

### Add a new persisted document artifact

If the artifact belongs to one document folder, follow the existing pattern:

1. create a small service helper in `services/`
2. create a hook to manage React-facing state and persistence
3. subscribe to watcher events if disk mutations can happen outside the immediate UI path

## Common Mistakes To Avoid

- assuming `DocumentContext` is the active source of truth for title/content today
- putting filesystem or serialization details into presentational components
- writing directly to disk from multiple places without watcher-aware refresh paths
- bypassing `externalValueVersion` when restoring editor content from history
- moving chat-specific task orchestration back into `Layout.tsx`
- moving editor-specific orchestration into `panels/chat/index.tsx`
- duplicating chat session indexing logic instead of reusing `chat-session-storage.ts`
- duplicating history file parsing instead of reusing `history-service.ts`

## Debugging Map

If the problem is mainly about:

- route/provider lifecycle: start with `Page.tsx`
- load/save/history behavior: start with `Layout.tsx` and `use-document-history.ts`
- header buttons or history dropdown: start with `Header.tsx` and `components/HistoryMenu.tsx`
- agentic chat UI: start with `panels/chat/index.tsx`, `panels/chat/Provider.tsx`, `panels/chat/hooks/`, and `panels/chat/context/contexts.ts`
- chat persistence to disk: start with `panels/chat/index.tsx`
- image uploads/sidebar metadata: start with `panels/resources/ResourcesPanel.tsx`
- editor streaming behavior: start with `Layout.tsx`, then inspect `TextEditor`
- document-scoped state ownership confusion: inspect `Layout.tsx` and `context/state.ts` together

## Recommended Refactor Direction

This folder currently works, but it has an important architectural split:

- `Layout.tsx` owns the live editor state locally
- `DocumentContext` still contains overlapping fields for a reducer-driven document model

Before major changes, choose one of these directions deliberately:

1. keep `Layout.tsx` as the orchestration source of truth and slim the unused overlap
2. move the page back toward fully reducer-driven document state and make `Layout.tsx` thinner

What should be avoided is an accidental middle state where both models are treated as authoritative at the same time.
