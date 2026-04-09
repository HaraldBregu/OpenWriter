---
name: Files Feature Implementation
description: File management system for workspace resources/files/ sub-folder with dedicated IPC, watcher, and Redux slice
type: project
---

Implemented 2026-04-09. The files feature manages the `resources/files/` sub-folder independently from the general resources system.

**Workspace sub-folder auto-creation:** When a workspace is set via `Workspace.setCurrent()`, four sub-folders are created under `resources/`: `files/`, `data/`, `content/`, `images/`.

**Shared types added to `src/shared/types.ts`:**
- `FileEntry` -- id, name, path, relativePath, size, mimeType, createdAt, modifiedAt
- `FileEntryChangeEvent` -- type, fileId, filePath, timestamp

**IPC channels added to `WorkspaceChannels`:**
- `files:get-all` -- load all files
- `files:insert` -- open picker + copy files
- `files:delete` -- delete a file
- `files:changed` -- watcher push event
- `files:watcher-error` -- watcher error event

**Main process services:**
- `FilesService` (`src/main/workspace/files-service.ts`) -- getFiles, insertFiles, deleteFile
- `FilesWatcherService` (`src/main/workspace/files-watcher.ts`) -- chokidar-based watcher for resources/files/

**Redux slice:** `src/renderer/src/store/files/` with state, actions (loadFiles, removeFiles), reducer (insertFilesRequested, insertFilesCompleted, fileEntryRemoved, resetFiles), selectors, and listener middleware.

**FilesPage** at `src/renderer/src/pages/resources/Files/FilesPage.tsx` uses the dedicated files slice instead of the general workspace resources.
