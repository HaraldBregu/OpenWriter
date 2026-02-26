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
- bluetooth → `window.bluetooth.*`; clipboard → `window.clipboard.*`; cron → `window.cron.*`
- lifecycle → `window.lifecycle.*`; notification → `window.notification.*`; wm → `window.wm.*`
- output → `window.output.*`; personality → `window.personality.*`; posts → `window.posts.*`
- documents → `window.documents.*`; store → `window.store.*`; workspace → `window.workspace.*`
- directories → `window.directories.*`; agent → `window.agent.*`; fs → `window.fs.*`
- dialog → `window.dialog.*`; network → `window.network.*`; media → `window.media.*`
- app utilities → `window.app.*`; window controls → `window.win.*`
- context menus → `window.contextMenu.showWriting/onWritingAction/showPost/onPostAction`
- AI pipeline → `window.ai.inference/cancel/listAgents/onEvent`

## window.store — new vs old methods
- OLD (still in preload): `getAllModelSettings`, `getModelSettings`, `setSelectedModel`, `setApiToken`, `setModelSettings`
- NEW (added in parallel with aiSettingsSlice): `getAllProviderSettings`, `setProviderSettings`, `setInferenceDefaults`
- `aiSettingsSlice.ts` targets the NEW API; always check preload d.ts before calling store methods

## Redux Slice Conventions
- Reference slices: `postsSlice.ts` (sync, prepare pattern), `personalityFilesSlice.ts` (async thunks)
- New output system: `outputSlice.ts`; new AI settings: `aiSettingsSlice.ts`
- Selectors use `createSelector` from `@reduxjs/toolkit` (reselect bundled)
- Factory selectors return a new `createSelector` instance per call — safe at module level with stable args
- Store is at `src/renderer/src/store/index.ts` — add new reducers here

## Shared Types Pattern
- Shared types: `src/shared/types/` — no Electron/Node/React/browser imports allowed
- Relative import paths from renderer:
  - From `src/renderer/src/store/` → `../../../shared/types/aiSettings`
  - From `src/renderer/src/hooks/` → `../../../shared/types/aiSettings`
  - From `src/renderer/src/components/personality/` → `../../../../shared/types/aiSettings`
- `tsconfig.web.json` include array must contain `"src/shared/**/*"` for the renderer TS project to resolve these
- When moving a type to shared, re-export from old location so existing imports don't break:
  `export type { InferenceSettings } from '../../../../shared/types/aiSettings'`
  `export { DEFAULT_INFERENCE_SETTINGS } from '../../../../shared/types/aiSettings'`
- Then add a local `import type` for use inside the same file's component body

## AI Settings Architecture (added Feb 2026)
- Slice: `src/renderer/src/store/aiSettingsSlice.ts`
  - State: `{ providerSettings: Record<string, ProviderSettings>, status, error }`
  - Thunks: `loadAISettings`, `saveProviderSettings`, `persistInferenceDefaults`
  - Actions: `setSelectedModelLocal` (optimistic), `setInferenceDefaultsLocal` (optimistic)
  - Selectors: `selectAISettingsStatus/Error/AllProviderSettings/ProviderSettings(id)/EffectiveInferenceSettings(id)/SelectedModel(id)/ApiToken(id)`
- Bootstrap hook: `src/renderer/src/hooks/useAISettings.ts`
  - Dispatches `loadAISettings()` once when `status === 'idle'`; call at layout level
  - Returns: `{ providerSettings, status, selectModel, saveProviderSettings, updateApiToken }`
- Section hook: `src/renderer/src/hooks/useInferenceSettings.ts`
  - Signature: `useInferenceSettings(sectionId, defaultProviderId?)`
  - Returns: `{ settings, isLoaded, onChange, applySnapshot, resetToSectionDefaults }`
  - `onChange` debounces 500ms before calling `window.personality.saveSectionConfig`
  - `applySnapshot` sets local state without disk write (restoring saved conversations)
  - `resetToSectionDefaults` uses section defaults from ref or Redux global fallback
  - Replaces inline `useState`/`useEffect`/timer pattern in `PersonalitySimpleLayout`

## Output System (kept for reference — no longer used for writings)
- `outputSlice.ts` still exists but is NOT used by the writing creation flow
- Writing storage now uses `window.writingItems.*` exclusively (see Writing Creation Architecture below)

## Block Architecture (updated Feb 2026)
- `Block` interface (`src/renderer/src/components/ContentBlock.tsx`): `{ id, content, createdAt, updatedAt }` (ISO 8601 timestamps)
- `createBlock()` factory stamps both timestamps on creation
- On handleChange in pages, callers stamp `updatedAt: new Date().toISOString()` before dispatching
- Blocks are serialized to a single markdown string (`\n\n` separator) for `content.md` storage via `writingItems` API

## Component Library
- App components barrel: `@/components/app` — `AppButton`, `AppTextarea`, `AppInput`, `AppLabel`, `AppSelect*`, `AppDropdownMenu*`, `AppSwitch`, `AppRadioGroup`, `AppRadioGroupItem`, etc.

## Page Patterns
- Reference page: `NewPostPage.tsx` — header with title input + sidebar toggle, content area, right sidebar w/ AI settings
- All content pages use `useAppDispatch`/`useAppSelector` from `../store`
- `canSave` guard pattern: derive boolean from local state, pass to `disabled` prop on save button

## AppContext / Theme System
- `ThemeMode` = `'light' | 'dark' | 'system'` — defined in `AppContext.tsx`, do NOT redefine
- `useTheme()` at `src/renderer/src/hooks/useTheme.ts` — call once in `AppLayout`
- `useIsDark()` at `src/renderer/src/hooks/useIsDark.ts` — MutationObserver on `<html>.classList`
- `AppContext.tsx` lives at `src/renderer/src/contexts/AppContext.tsx` (not `src/renderer/src/`)
- ALWAYS guard `window.app.*` calls with optional chaining (`window.app?.setTheme(theme)`) — the preload bridge is absent in Jest (jsdom) and any non-Electron renderer context. Bare access crashes with "Cannot read properties of undefined".
- Likewise guard `window.app?.onThemeChange` before registering IPC listeners: `if (!window.app?.onThemeChange) return`

## Test Location Convention
- Jest renderer project scans `tests/unit/renderer/` ONLY — tests under `src/renderer/src/**/__tests__/` are NOT picked up.
- Correct locations: `tests/unit/renderer/contexts/`, `tests/unit/renderer/components/`, `tests/unit/renderer/hooks/`, etc.
- Use `@/` path alias (e.g. `@/contexts/AppContext`) in renderer test files instead of relative `../` paths.
- Add `localStorage.clear()` in `beforeEach` for any test that exercises `ThemeProvider` — `readPersistedTheme()` reads localStorage and leaks state across tests.

## TipTap Editor (v3)
- `setContent(content, { emitUpdate: false })` — second arg is object in v3, not boolean
- `immediatelyRender: false` required in Electron/Vite
- Use ref pattern for callbacks in `useEditor` to avoid editor re-creation
- Compare `editor.getHTML()` vs incoming content before calling `setContent` to avoid cursor reset
- Component: `src/renderer/src/components/ContentBlock.tsx`

## PersonalitySettingsPanel
- Location: `src/renderer/src/components/personality/PersonalitySettingsSheet.tsx`
- `InferenceSettings` now lives in `src/shared/types/aiSettings.ts`; sheet re-exports it
- Temperature = "Creativity Level" dropdown; maxTokens = "Text Length" dropdown
- ModelsSettings uses i18n (`useTranslation`) — preserve `t()` calls when modifying

## Settings Page Patterns
- Settings page: `src/renderer/src/pages/SettingsPage.tsx` — tabs: `general|models|media|devices|tools|system`
- `CollapsibleSection` at `src/renderer/src/pages/settings/CollapsibleSection.tsx`
- Row pattern: `flex items-center justify-between px-4 py-3`, grouped in `rounded-md border divide-y`

## Task Manager Integration (added Feb 2026)
- Context: `src/renderer/src/contexts/TaskContext.tsx` — hand-rolled external store (no Redux), subscriptions per taskId + 'ALL' key
- Hooks:
  - `useTaskSubmit(type, input, options?)` — submit + full lifecycle for a single task
  - `useTaskList(filter?)` — all active tasks with optional filter, auto-updates via store
  - `useTaskEvents(taskId?)` — bounded event history (max 50), global or scoped
  - `useTaskProgress(taskId)` — useSyncExternalStore for surgical percent/message updates
  - `useTaskStatus(taskId)` — status-only, minimal re-renders
- `TrackedTaskState` includes: taskId, type, status, priority, progress, queuePosition, durationMs, error, result, streamedContent, events
- `TaskStatus` = `'queued' | 'paused' | 'running' | 'completed' | 'error' | 'cancelled'` — 'paused' is NOT terminal
- All new event types in applyEvent: 'paused', 'resumed', 'priority-changed', 'queue-position'
- Hooks (updated Feb 2026):
  - `useTaskSubmit` — adds pause(), resume(), updatePriority(), queuePosition
  - `useTaskResult(taskId?)` — fetches completed result via window.task.getResult(); auto-refetches on 'completed'
  - `useTaskStream(taskId)` — useSyncExternalStore-backed token accumulation, zero cross-task re-renders
  - `useTaskQueue()` — live sorted queue view + queueStatus metrics via window.task.queueStatus()
- HOC: `src/renderer/src/components/withTaskTracking.tsx` — injects `taskTracking` prop bag
- CRITICAL: pause()/resume() read live store snapshot (not React state) to avoid stale-closure bugs
- PAUSABLE_STATUSES = 'queued' | 'running' only — 'paused' itself is NOT pausable (prevents double-pause)
- All hooks require `<TaskProvider>` ancestor; throw descriptive error if missing
- Place `<TaskProvider>` once at AppLayout level — single IPC subscription for the whole app
- `window.task` is optional in preload.d.ts — always guard with `typeof window.task?.method === 'function'`
- Tests: `useTaskSubmit.test.tsx` (16) + `useTaskSubmitExtended.test.tsx` (16) = 32 passing

## Writing Creation Architecture (migrated to writingItems API, Feb 2026)
- ALL writing storage now goes through `window.writingItems.*` (WritingItemsService)
- Disk format: `<workspace>/writings/<YYYY-MM-DD_HHmmss>/config.json` + `content.md`
- `content.md` stores all blocks serialized as joined text (`\n\n` separator)
- Slice: `src/renderer/src/store/writingItemsSlice.ts`
  - `WritingEntry`: `{ id (UUID), writingItemId (YYYY-MM-DD_HHmmss folder name), title, blocks, category, tags, createdAt, updatedAt, savedAt }`
  - Thunk: `loadWritingItems` → calls `window.writingItems.loadAll()`
  - Actions: `addEntry`, `setWritingItemId`, `updateEntryBlocks`, `updateEntryTitle`, `removeEntry`
  - Selectors: `selectWritingEntries`, `selectWritingEntryById(id)`, `selectWritingItemsStatus`
- Hook: `src/renderer/src/hooks/useCreateWriting.ts`
  - Calls `window.writingItems.create(...)` directly — NO Redux thunks
  - Dispatches `addEntry` only after disk write succeeds (conservative, non-optimistic)
  - In-flight guard via `useRef(false)` prevents double-creation from rapid clicks
  - Returns `{ createWriting, isLoading, error, reset }`
- Hook: `src/renderer/src/hooks/useWritingItems.ts` (replaces `useOutputFiles`)
  - Subscribes to `window.workspace.onChange` AND `window.writingItems.onFileChange`
  - Dispatches `loadWritingItems` thunk on mount + debounced reloads (500ms)
  - Call once at AppLayout level
- Hook: `src/renderer/src/hooks/useDraftEditor.ts`
  - Edit mode auto-save: calls `window.writingItems.save(writingItemId, { title, content })` directly
  - Draft auto-commit: calls `window.writingItems.create(...)` directly after 1s debounce
  - Returns `savedWritingItemIdRef` (NOT `savedOutputIdRef`) for use in delete handler
- AppLayout: `useWritingItems()` called in outer `AppLayout`; sidebar uses `selectWritingEntries`
- useWritingContextMenu: duplicate/delete go directly through `window.writingItems.create/delete`
- writingsSlice.ts and writingsHydration.ts are NO LONGER imported by the store — only writingItemsSlice is used
- i18n keys: `writing.creating`, `writing.createError`, `writing.noWorkspace`, `home.noRecentWritings` (EN + IT)

## i18n System
- Translation files: `resources/i18n/en/main.json` and `resources/i18n/it/main.json`
- Always use `useTranslation` from `react-i18next` — never hardcode user-visible strings
- Key namespaces: `common`, `sidebar`, `settings.*`, `writing`, `post`, `contentBlock`, `inferenceSettings`, `welcome`, `documents`, `directories`, `personality`, `home`, `errorBoundary`, `titleBar`
- Interpolation: `t('key', { variable: value })` — e.g. `t('post.charactersAndWords', { chars, words })`
- Both EN and IT files must be kept in sync whenever new keys are added
- Helper functions that format labels must accept `t` as a parameter (e.g. `statusLabel(s, t)`)
- Sub-components inside pages each call `useTranslation()` independently (React memo boundary is fine)
