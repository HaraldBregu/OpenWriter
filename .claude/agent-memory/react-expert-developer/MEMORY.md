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
