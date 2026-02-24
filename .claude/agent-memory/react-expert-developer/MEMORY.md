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
- App components barrel: `@/components/app` — `AppButton`, `AppTextarea`, `AppInput`, `AppLabel`, `AppSelect*`, `AppDropdownMenu*`, `AppSwitch`, `AppRadioGroup`, `AppRadioGroupItem`, etc.
- Pattern: import named exports from `@/components/app`

## Page Patterns
- Reference page: `NewPostPage.tsx` — header with title input + sidebar toggle, content area, right sidebar w/ AI settings
- Simple content pages (Notes, Messages) skip the sidebar; Writing page includes a stripped-down AI settings sidebar
- All content pages use `useAppDispatch`/`useAppSelector` from `../store`
- `canSave` guard pattern: derive boolean from local state, pass to `disabled` prop on save button

## AppContext (UI State)
- Location: `src/renderer/src/contexts/AppContext.tsx`, exported via `src/renderer/src/contexts/index.ts`
- `ThemeMode` = `'light' | 'dark' | 'system'` — already defined, do NOT redefine
- Convenience hooks: `useThemeMode()`, `useAppActions()` (returns `{ setTheme, ... }`), `useAppSelector(selector)`
- Theme is persisted to `localStorage` under key `'app-theme-mode'`; read eagerly at module level via `readPersistedTheme()` so initial render never flickers
- UI preferences are persisted separately under `'app-ui-preferences'`

## Theme System
- `useTheme()` hook at `src/renderer/src/hooks/useTheme.ts` — call once in `AppLayout` (already wired)
- Applies `dark` class to `<html>` based on `ThemeMode` from AppContext
- In `system` mode: tracks `(prefers-color-scheme: dark)` MediaQuery + IPC `change-theme` events from Electron menu
- In `light`/`dark` modes: ignores OS/IPC changes (user preference wins)
- `useIsDark()` at `src/renderer/src/hooks/useIsDark.ts` — MutationObserver on `<html>.classList` for components that need a boolean

## Settings Page Patterns
- Settings page at `src/renderer/src/pages/SettingsPage.tsx` — tab-based layout (`general|models|media|devices|tools|system`)
- `CollapsibleSection` at `src/renderer/src/pages/settings/CollapsibleSection.tsx` — toggle with chevron, content revealed below a `border-t`
- SystemSettings uses `CollapsibleSection` for each feature group
- Inner content rows follow: `flex items-center justify-between px-4 py-3` with `text-sm font-normal` labels and `text-xs text-muted-foreground` descriptions
- Grouped rows wrapped in `rounded-md border divide-y`
