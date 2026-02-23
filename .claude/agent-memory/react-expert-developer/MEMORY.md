# Project Memory

## Environment Variables
- Always use Vite's `import.meta.env.VITE_*` pattern for accessing environment variables. Never use `process.env` in renderer code.

## Preload Bridge Pattern
- Bridge types live in `src/preload/index.d.ts` — always read this file before writing async thunks that call `window.api.*`
- Bridge shapes often differ from Redux shapes (e.g. nested `metadata` object vs flat item). Always map at the thunk boundary.
- `outputSave` returns only `{ id, path, savedAt }` — must call `outputLoadOne` afterward to get the full `OutputFile` for Redux state.

## Redux Slice Conventions
- Two reference slices: `postsSlice.ts` (sync, prepare pattern) and `personalityFilesSlice.ts` (async thunks with extraReducers)
- New output system: `outputSlice.ts` — flat `OutputItem` mapped from nested `OutputFile` (preload type)
- Selectors use `createSelector` from `@reduxjs/toolkit` (reselect bundled in RTK)
- Factory selectors (e.g. `selectOutputItemsByType(type)`) return a new selector instance per call — safe when called at module level or with stable args
- Store is at `src/renderer/src/store/index.ts` — add new reducers here

## Output System (new folder-based storage)
- Storage: `workspace/output/{type}/{YYYY-MM-DD_HHmmss}/config.json + DATA.md`
- Types: `'posts' | 'writings' | 'notes' | 'messages'`
- Slice: `src/renderer/src/store/outputSlice.ts`
- Bridge API: `outputSave`, `outputLoadAll`, `outputLoadByType`, `outputLoadOne`, `outputDelete`

## Component Library
- App components barrel: `@/components/app` — `AppButton`, `AppTextarea`, `AppInput`, `AppLabel`, `AppSelect*`, `AppDropdownMenu*`, `AppSwitch`, etc.
- Pattern: import named exports from `@/components/app`

## Page Patterns
- Reference page: `NewPostPage.tsx` — header with title input + sidebar toggle, content area, right sidebar w/ AI settings
- Simple content pages (Notes, Messages) skip the sidebar; Writing page includes a stripped-down AI settings sidebar
- All content pages use `useAppDispatch`/`useAppSelector` from `../store`
- `canSave` guard pattern: derive boolean from local state, pass to `disabled` prop on save button
