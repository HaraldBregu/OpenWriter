# Workspace And Documents

Everything the user produces lives inside a **workspace** — a plain folder
on disk, chosen by the user.

## The Workspace Folder

When the user opens a workspace, OpenWriter ensures the following
sub-folders exist:

```text
<workspace>/
├── documents/     # user-facing documents (one folder per document)
├── files/         # raw files the user drops in
├── contents/      # structured content / notes
├── images/        # images generated at workspace scope
└── data/          # machine-managed data
    ├── rag_index/         # (reserved) vector-store index for RAG
    ├── vector_store/      # (reserved) on-disk embeddings
    └── indexing-info.json # status + stats for indexed resources
```

Only one workspace is active per window. Opening a second workspace opens
a second window with its own set of workspace-scoped services — workspace
state is created fresh by `WindowContextManager`
(`src/main/core/window-context.ts`) so state never leaks between windows.

## Recent Workspaces

The app remembers up to `MAX_RECENT_WORKSPACES` recently opened
workspaces. The WelcomePage shows them so the user can jump back quickly.

A recent entry can be:

- Opened (sets it as current and routes to `/home`)
- Removed from the list (does not touch the filesystem)

The active workspace path is persisted; on next launch the app tries to
restore it. If the folder has been deleted or moved, the persisted value
is discarded and the user is sent back to the WelcomePage.

## Deletion Detection

While a workspace is open, a timer checks periodically that the folder
still exists. If it was deleted or renamed outside the app:

1. The app clears the current workspace.
2. A `workspace:deleted` event is broadcast.
3. The renderer routes the user back to the WelcomePage.

Interval constant: `WORKSPACE_VALIDATION_INTERVAL_MS` in
`src/main/constants.ts`.

## Documents

A **document** is a folder under `<workspace>/documents/<uuid>/`:

```text
documents/
└── 0191ff8c-9a16-7a54-b1c2-7f6b2c3b9a42/
    ├── content.md       # the main body, edited by Tiptap
    ├── config.json      # title, type, timestamps, etc.
    ├── images/          # images inserted or generated for this doc
    └── chats/           # chat sessions tied to this document
```

### `content.md`

Plain Markdown. What Tiptap renders and what the user edits. Overwritten
on every debounced save from the editor. Also appended to by the
`generate_image` tool when the agent inserts an image mid-stream.

### `config.json`

```json
{
  "title": "Chapter 1 — Opening",
  "type": "",
  "createdAt": "2026-04-23T12:00:00.000Z",
  "updatedAt": "2026-04-23T13:02:11.231Z"
}
```

Extra fields (provider, model, tags, visibility…) are tolerated — the
loader preserves unknown fields in memory and writes them back on save.

### Document IDs

Documents use **UUID v7** folder names. UUID v7 encodes creation time, so
sorting folders lexicographically also sorts them by creation date.

### History

Each document maintains a history timeline exposed through the
**HistoryMenu** component. Entries capture content + title at points in
time. Restoring an entry rewrites the document to that state.

## Project Workspace Info

A small `project-workspace.json` at the root of the workspace stores
human-readable metadata about the project itself:

- `name`
- `description`

Editable from the Settings → Workspace page.

## File Manager

All filesystem operations go through `FileManager`
(`src/main/shared/file_manager/`) which enforces:

- Extra allowed roots are added per-workspace (the current workspace
  path is whitelisted)
- Path validation prevents `..` escape
- Atomic writes where requested

Tools and IPC handlers never touch `fs` directly — they go through the
manager.

## Resources

The **resources library** (see [MEDIA_INGESTION.md](./MEDIA_INGESTION.md))
imports external files into the workspace so the RAG agent can retrieve
them later. Resources are stored as ordinary files under `files/` or
`contents/`, indexed on demand.

## Output Files

`OutputFilesService` (`src/main/workspace/output-files.ts`) manages the
`documents/` folder as a uniform output type. Operations:

- `save` — create a new document with metadata
- `loadAll` / `loadByType` / `loadOne` — enumerate or fetch
- `delete` / `trash` — permanent vs soft delete

The uniform `OutputType` is currently `documents`, left nominal for
forward compatibility.

## Filesystem Watching

`DocumentsWatcherService` (window-scoped) and related watchers use
`chokidar` to observe the workspace for external changes:

- Document added/removed/changed
- Image changed in a document's `images/` folder
- Resource added/removed

Events reach the renderer as `output:file-changed`, `output:document-image-changed`,
etc., and drive the Redux store's document list and the open document's
live state. The user can edit `content.md` in a third-party editor and
the Tiptap view updates on the next watcher tick.

## Opening The Workspace In Finder / Explorer

A sidebar button calls `window.workspace.openWorkspaceFolder()` which
invokes `shell.openPath` for the current workspace. There are also
buttons to open just the `data/` folder, `contents/`, `files/`, or the
specific document folder.

## Boundaries

- The **renderer never sends absolute paths** for privileged actions.
  It sends an `id` (document ID) and the main process resolves the
  absolute path from the current workspace. This prevents a compromised
  renderer from targeting arbitrary files.
- Vector store and index paths are derived from the workspace root and
  validated before any destructive operation.

## Data Flow At A Glance

```text
User action (rename, write, delete)
  ─► renderer → window.workspace.* IPC
       ─► WorkspaceIpc
            ─► Workspace facade (window-scoped)
                 ─► WorkspaceService / OutputFilesService / FileManager
                      ─► disk
                      ─► EventBus broadcast
                           ─► renderer workspace reducer updates list
```
