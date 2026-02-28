# SOLID Expert Agent Memory

## Project: OpenWriter

### Architecture Overview
- Electron + React 19 + TypeScript renderer
- Redux Toolkit for state (postsSlice, writingsSlice, outputSlice, personalityFilesSlice, chatSlice, aiSettingsSlice, directoriesSlice)
- React Router (hash-based) for navigation
- TipTap rich text editor in ContentBlock
- Two context providers: AppContext (global theme/UI/user) and PersonalityTaskContext (AI task orchestration)

### Key SOLID Violations Found (2026-02-25 Analysis)

See `violations.md` for full details. Summary:

**Critical (SRP)**
- `AppLayout.tsx` (715 lines): navigation, context menu handling, file watching, routing, data loading hooks — 5+ responsibilities
- `NewPostPage.tsx` / `ContentPage.tsx` (437/446 lines): near-identical files with draft management, auto-save, block CRUD, AI settings, routing — DRY violation + SRP

**Critical (DIP)**
- `PersonalityTaskContext.tsx` (492 lines): directly calls `window.task.onEvent`, `window.personality.save`, `window.store.getModelSettings` — tightly coupled to Electron IPC globals

**High (OCP)**
- `postsSlice.ts:extraReducers` uses string-matching `'output/loadAll/fulfilled'` to avoid circular imports — brittle and closed for extension
- `postsSyncMiddleware.ts` uses string-prefix matching `actionType.startsWith('posts/')` instead of action matchers — fragile pattern

**High (SRP)**
- `AppContext.tsx` (422 lines): theme management, user state, UI preferences, modal state, online status, sync time — 6 concerns in one context provider

**Medium (DRY/SRP)**
- `DocumentCard` and `DocumentListItem` in `DocumentsPage.tsx` share identical dropdown menu logic (copy path, view, delete) — same menu duplicated in two components

**Medium (ISP)**
- `PersonalitySimpleLayout.tsx` selector at line 59: hardcoded union type with all 10 personality sections instead of accepting `string`

### Refactoring Completed (2026-02-25)
- **DocumentActionMenu** extracted to `src/renderer/src/components/DocumentActionMenu.tsx` — eliminates duplicated dropdown between DocumentCard and DocumentListItem
- **usePostContextMenu** extracted to `src/renderer/src/hooks/usePostContextMenu.ts` — fixes re-subscription on every keystroke via ref pattern
- **useWritingContextMenu** extracted to `src/renderer/src/hooks/useWritingContextMenu.ts` — same ref pattern fix

### Ref Pattern for IPC Subscriptions (React — key insight)
When a `useEffect` subscribes to IPC events and needs latest Redux state without re-subscribing:
```ts
const dataRef = useRef(data)
dataRef.current = data  // assign on every render
useEffect(() => {
  const cleanup = window.someIpc.onEvent((event) => {
    const item = dataRef.current.find(...)  // reads latest via ref
  })
  return cleanup
}, [dispatch, navigate])  // only stable deps — NOT the array
```

### Remaining Refactoring Priorities
1. Export `PersonalitySectionId` type from `personalityFilesSlice.ts` (trivial)
2. Replace `postsSyncMiddleware` string-prefix matching with `isAnyOf()` (low risk)
3. Break circular import in postsSlice/writingsSlice via RTK `createListenerMiddleware` (medium risk)
4. Split AppContext (422 lines) into 5 focused contexts (medium risk, many consumers)
5. Move IPC calls in PersonalityTaskContext behind injected service interface (high risk, deferred)
6. Deduplicate NewPostPage/NewWritingPage via shared hook or base (medium)
