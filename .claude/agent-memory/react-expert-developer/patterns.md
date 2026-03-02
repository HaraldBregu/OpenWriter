# Patterns

## Optimistic UI Updates with File-Watcher Reconciliation

**Context:** AppLayout sidebar shows a writing list loaded from disk via `window.workspace.loadOutputsByType`. A `window.workspace.onOutputFileChange` watcher reloads the list when files change on disk. The watcher has inherent latency (OS debounce + IPC round-trip), so new items appear with a noticeable delay after creation.

**Pattern:** Pass an `onCreated` callback option to the creation hook. The hook calls it immediately after the IPC `saveOutput` resolves (before navigation). The caller then prepends the new item to local state optimistically. When the watcher fires shortly after, `refreshWritings()` does a full reload and naturally reconciles — no deduplication logic needed because `setWritings` replaces the array wholesale.

**Files:**
- Hook: `src/renderer/src/hooks/useCreateWriting.ts` — `UseCreateWritingOptions.onCreated` + `optionsRef` pattern
- Consumer: `src/renderer/src/components/AppLayout.tsx` — `handleWritingCreated` callback, `setWritings((prev) => [newItem, ...prev])`

**optionsRef pattern:** Store `options` in a ref (`optionsRef.current = options` on every render) so `createWriting` (a `useCallback` with `[navigate]` deps) can always call the latest `onCreated` without the callback being listed as a dependency. This avoids recreating `createWriting` when the caller's callback identity changes.

**Shared type import from renderer hooks:** `import type { SaveOutputResult } from '../../../shared/types'` — NOT from the preload `.d.ts` file directly (TypeScript module resolution won't find `.d.ts` files by that path). The `tsconfig.web.json` includes `"src/shared/**/*"` so the relative path `../../../shared/types` works from `src/renderer/src/hooks/`.
