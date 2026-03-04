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

## TipTap v3 ReactNodeViewRenderer Pattern

**Files:**
- Extension: `src/renderer/src/components/app/extensions/CustomParagraph.ts`
- NodeView React component: `src/renderer/src/components/app/extensions/ParagraphNodeView.tsx`

**Key rules (v3-specific):**
- `NodeViewContent` defaults to `as="div"` (type parameter `T` is `NoInfer<T>`). Passing `as="p"` causes TS2322 — keep the default div, apply `block` class instead.
- `NodeViewWrapper` accepts any `React.ElementType` for `as` — use `as="div"` with Tailwind flex layout.
- Gutter button containers MUST have `contentEditable={false}` + `suppressContentEditableWarning` so ProseMirror ignores them.
- Call `e.preventDefault()` on every `onMouseDown` inside non-editable zones — prevents ProseMirror from collapsing the selection.
- To replace StarterKit's paragraph: `StarterKit.configure({ paragraph: false, ... })` then add `CustomParagraph` to the extensions array.
- Extension options (callbacks) are typed via `Paragraph.extend<TOptions>({})` — access them in the NodeView as `extension.options as TOptions`.
- Gutter layout trick: add `px-8` to `EditorContent`, then use `-mx-8` on the NodeViewWrapper so gutters "bleed" into padding without shifting text.
- `getPos` in NodeViewProps may be `boolean | (() => number | undefined)` in v3 — always guard: `typeof getPos === 'function' ? getPos() : undefined`.
- Hover-reveal pattern: `group` on NodeViewWrapper + `opacity-0 group-hover:opacity-100` on button elements (CSS-only, zero JS).

## Route-param-driven pages with async load + TipTap editor

**Symptom:** First navigation to `/content/:id` shows blank content. Navigating away and back fixes it.

**Root causes (two independent bugs):**

1. **Stale `loaded` guard across param changes.** React Router reuses the same component instance when only the route param changes (no unmount). If `loaded` stays `true` from the previous item, the debounced save can fire with stale content before the async `loadOutput` resolves, overwriting the new file with old data. Additionally, the user briefly sees the old item's content.

2. **`initialValueRef` captures empty string at mount.** TipTap's `EditorAdapter` uses `useEditor(options, [])` — editor created once. `initialValueRef.current = value` is captured at mount when `value` is still `""` (load is in-flight), so `onCreate` sets empty content. When `value` later changes, the `useEffect` sync runs, but `internalChangeRef.current` being `true` (from any TipTap internal update like `setEditable`) can silently skip the first external sync.

**Fix:**

1. In the load `useEffect`, reset `setLoaded(false)`, `setTitle("")`, `setContent("")` synchronously at the top (before the async call) so the save guard is disabled and stale content is cleared immediately on every `id` change.

2. Add `key={id}` to `<TextEditor>` so TipTap fully unmounts/remounts for each new writing. This guarantees `initialValueRef` captures the correct initial value and `onCreate` always runs with real content, regardless of async timing.

**Pattern (ContentPage.tsx):**
```tsx
// Load effect: reset state synchronously before async call
useEffect(() => {
  if (!id) return;
  let cancelled = false;
  setLoaded(false);
  setTitle("");
  setContent("");
  async function load() { ... }
  load();
  return () => { cancelled = true; };
}, [id]);

// Key forces editor remount per writing
<TextEditor key={id} value={content} ... />
```

## Adding a new IPC channel (workspace example)

1. Add constant to `WorkspaceChannels` in `src/shared/channels.ts`
2. Add type entry in `InvokeChannelMap` in the same file
3. Add `ipcMain.handle` in `src/main/ipc/WorkspaceIpc.ts`
4. Add method to `WorkspaceApi` interface in `src/preload/index.d.ts`
5. Add implementation in `src/preload/index.ts` (inside the `workspace` object literal)
6. Call `window.workspace.<method>` from renderer code
