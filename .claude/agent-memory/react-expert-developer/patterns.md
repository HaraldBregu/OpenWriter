# Patterns

## Optimistic UI Updates with File-Watcher Reconciliation

**Context:** AppLayout sidebar shows a writing list loaded from disk via `window.workspace.loadOutputsByType`. A `window.workspace.onOutputFileChange` watcher reloads the list when files change on disk. The watcher has inherent latency (OS debounce + IPC round-trip), so new items appear with a noticeable delay after creation.

**Pattern:** Pass an `onCreated` callback option to the creation hook. The hook calls it immediately after the IPC `saveOutput` resolves (before navigation). The caller then prepends the new item to local state optimistically. When the watcher fires shortly after, `refreshWritings()` does a full reload and naturally reconciles — no deduplication logic needed because `setWritings` replaces the array wholesale.

**Files:**
- Hook: `src/renderer/src/hooks/useCreateWriting.ts` — `UseCreateWritingOptions.onCreated` + `optionsRef` pattern
- Consumer: `src/renderer/src/components/AppLayout.tsx` — `handleWritingCreated` callback, `setWritings((prev) => [newItem, ...prev])`

**optionsRef pattern:** Store `options` in a ref (`optionsRef.current = options` on every render) so `createWriting` (a `useCallback` with `[navigate]` deps) can always call the latest `onCreated` without the callback being listed as a dependency. This avoids recreating `createWriting` when the caller's callback identity changes.

**Shared type import from renderer hooks:** `import type { SaveOutputResult } from '../../../shared/types'` — NOT from the preload `.d.ts` file directly (TypeScript module resolution won't find `.d.ts` files by that path). The `tsconfig.web.json` includes `"src/shared/**/*"` so the relative path `../../../shared/types` works from `src/renderer/src/hooks/`.

## Electron shell.trashItem (Electron 40+)

- In Electron 40+, `shell.trashItem(path)` returns `Promise<void>` and **throws** on failure — it does NOT return `Promise<boolean>`.
- Do NOT test the return value for truthiness — TypeScript will error with "An expression of type 'void' cannot be tested for truthiness" (TS1345).
- Correct pattern: wrap in `try/catch` and fall back to `fs.rm(path, { recursive: true })` if the platform does not support trash.
- The `trash` method in `OutputFilesService` follows this pattern and also calls `emitChangeEvent(folderPath, 'removed')` explicitly after trashing so the renderer is notified without relying on chokidar (which may not fire reliably for trashed folders).

## Adding a new IPC channel (workspace example)

1. Add constant to `WorkspaceChannels` in `src/shared/channels.ts`
2. Add type entry in `InvokeChannelMap` in the same file
3. Add `ipcMain.handle` in `src/main/ipc/WorkspaceIpc.ts`
4. Add method to `WorkspaceApi` interface in `src/preload/index.d.ts`
5. Add implementation in `src/preload/index.ts` (inside the `workspace` object literal)
6. Call `window.workspace.<method>` from renderer code
