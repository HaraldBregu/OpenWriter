# Project Memory

## Environment Variables
- Always use Vite's `import.meta.env.VITE_*` pattern for accessing environment variables. Never use `process.env` in renderer code.

## Preload Bridge Pattern
- Bridge types live in `src/preload/index.d.ts` — always read this file before writing async thunks that call any `window.*` bridge.
- Bridge shapes often differ from Redux shapes (e.g. nested `metadata` object vs flat item). Always map at the thunk boundary.
- `window.api` NO LONGER EXISTS — fully split into domain namespaces. See Namespace Map below.
- `window.output.save` returns only `{ id, path, savedAt }` — construct the full `OutputItem` inline from input; no follow-up load needed.

## Namespace Map (window.api is gone — use these namespaces)
All methods drop the domain prefix: `window.output.save`, `window.workspace.getCurrent`, etc.
- bluetooth → `window.bluetooth.*`
- clipboard → `window.clipboard.*`
- cron / onCronJobResult → `window.cron.*`
- lifecycle / onLifecycleEvent → `window.lifecycle.*`
- notification / onNotificationEvent → `window.notification.*`
- wm / onWmStateChange → `window.wm.*`
- output / onOutputFileChange / onOutputWatcherError → `window.output.*`
- personality / onPersonality* → `window.personality.*`
- posts / onPosts* → `window.posts.*`
- documents / onDocuments* → `window.documents.*`
- store → `window.store.*`
- workspace → `window.workspace.*`
- directories / onDirectoriesChanged → `window.directories.*`
- agent / onAgentEvent → `window.agent.*`
- fs / onFsWatchEvent → `window.fs.*`
- dialog → `window.dialog.*`
- network / onNetworkStatusChange → `window.network.*`
- getPlatform / showContextMenu / setTheme / onThemeChange / onLanguageChange / popupMenu / playSound / onFileOpened → `window.app.*`
- windowMinimize/Maximize/Close/isMaximized/isFullScreen/onMaximizeChange/onFullScreenChange → `window.win.*`
- showWritingContextMenu/onWritingContextMenuAction → `window.contextMenu.showWriting` / `window.contextMenu.onWritingAction`
- showPostContextMenu/onPostContextMenuAction → `window.contextMenu.showPost` / `window.contextMenu.onPostAction`
- media* → `window.media.*`
- pipelineRun → `window.ai.inference`, pipelineCancel → `window.ai.cancel`, pipelineListAgents → `window.ai.listAgents`, onPipelineEvent → `window.ai.onEvent`

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
- Bridge API: `window.output.save`, `window.output.loadAll`, `window.output.update`, `window.output.delete`

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

## TipTap Editor (v3)
- Installed: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` (v3.20.0)
- v3 API differences from v2: `setContent(content, options)` — second arg is `SetContentOptions` object, NOT a boolean. Use `{ emitUpdate: false }` to suppress onChange on programmatic updates.
- v3 does NOT auto-add `is-editor-empty` class — handle placeholder via React state (`editor.isEmpty`) + an absolutely-positioned span overlay
- `immediatelyRender: false` required to avoid SSR hydration warnings in Electron/Vite
- Use ref pattern for `onChange`/`blockId` callbacks in `useEditor` options to avoid editor re-creation on prop changes
- External content sync: compare `editor.getHTML()` vs `block.content` in `useEffect` before calling `setContent` — avoids cursor-reset on every keystroke
- ProseMirror global styles in `src/renderer/src/index.css` (outside `@layer`): reset `outline`, `margin-top` between children, `margin: 0` on `p`
- Component at: `src/renderer/src/components/ContentBlock.tsx`

## PersonalitySettingsPanel (Inference Settings Sidebar)
- Location: `src/renderer/src/components/personality/PersonalitySettingsSheet.tsx`
- Used by both `NewWritingPage` and `NewPostPage` as the right-side AI settings panel
- `InferenceSettings` shape: `{ providerId, modelId, temperature, maxTokens, reasoning }`
- Temperature exposed as "Creativity Level" dropdown (Precise/Balanced/Creative/Very Creative/Imaginative/Custom); slider shown only when Custom is selected
- maxTokens exposed as "Text Length" dropdown (Short 500/Medium 1000/Long 2000/Very Long 4000/Unlimited/Custom); number input shown only when Custom is selected
- Local `useState` tracks dropdown selection; helper functions `temperatureToPreset` and `maxTokensToPreset` map numeric values back to preset keys on init or slider change

## Settings Page Patterns
- Settings page at `src/renderer/src/pages/SettingsPage.tsx` — tab-based layout (`general|models|media|devices|tools|system`)
- `CollapsibleSection` at `src/renderer/src/pages/settings/CollapsibleSection.tsx` — toggle with chevron, content revealed below a `border-t`
- SystemSettings uses `CollapsibleSection` for each feature group
- Inner content rows follow: `flex items-center justify-between px-4 py-3` with `text-sm font-normal` labels and `text-xs text-muted-foreground` descriptions
- Grouped rows wrapped in `rounded-md border divide-y`
