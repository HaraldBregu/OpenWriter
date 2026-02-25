# SOLID Expert Agent Memory

## Project: OpenWriter (tesseract-ai)

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
- `NewPostPage.tsx` / `NewWritingPage.tsx` (437/446 lines): near-identical files with draft management, auto-save, block CRUD, AI settings, routing — DRY violation + SRP

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

### Refactoring Priorities
1. Extract `useDocumentContextMenu` hook from AppLayout.tsx (post/writing action handlers)
2. Extract `useAutoSave` hook shared by NewPostPage and NewWritingPage
3. Create `useEditorPage` or `EditorPageBase` to deduplicate NewPostPage/NewWritingPage
4. Move IPC calls in PersonalityTaskContext behind an injected service interface
5. Replace string-matched `'output/loadAll/fulfilled'` with RTK action matcher
6. Extract `DocumentActionMenu` component shared between DocumentCard and DocumentListItem
