# React Expert Developer — Agent Memory

## Key Patterns

- See `patterns.md` for detailed architectural notes.

## Critical Bug Patterns Found

- **File watcher suppression on import**: `DocumentsService.importFiles` calls
  `watcher.markFileAsWritten(destPath)` before every `fs.copyFile`, so the
  chokidar `'add'` event is always suppressed for app-imported files. Any code
  that relies on the watcher to refresh UI state after import will silently
  fail. The fix is to dispatch `loadResources()` directly in the listener after
  `importFiles` resolves. See `src/renderer/src/store/workspace/listeners.ts`.

## Editor Architecture Notes

- `EditorContext` (at `@/components/editor/EditorContext`) lives *inside* `TextEditor`
  and is only accessible to components rendered within the `EditorProvider` subtree
  (BubbleMenu, BlockControls, etc.). It cannot be consumed from siblings like sidebars.
- For components outside `TextEditor` that need the TipTap `Editor` instance, use
  `EditorInstanceContext` at `src/renderer/src/pages/document/context/editor-instance-context.tsx`.
  `TextEditor` publishes via `onEditorReady` prop; consumers call `useEditorInstance()`.
  `EditorInstanceProvider` must wrap both `TextEditor` and any sidebar that consumes it.
- Sidebar collapse pattern: `w-72` (open) / `w-0` (closed) with `transition-all duration-300`.
  `EditorSidebar` uses `w-14` (narrower — icon-only buttons).
- `@tiptap/extension-text-align` is NOT installed (as of March 2026). Do not reference it.
