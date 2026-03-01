# Redux State Expert Memory — OpenWriter

## Project Stack
- Electron + React + Redux Toolkit + TypeScript
- State: Redux Toolkit (configureStore, createSlice, createSelector, createAsyncThunk)
- No Redux Saga — async is done via createAsyncThunk + IPC preload bridge (`window.workspace.*`)
- TipTap (rich text) + Framer Motion (drag reorder)

## Key File Locations
- Redux store: `src/renderer/src/store/index.ts`
- Writing items slice: `src/renderer/src/store/writingItemsSlice.ts`
- Legacy writings slice: `src/renderer/src/store/writingsSlice.ts` (older, parallel system)
- Output slice: `src/renderer/src/store/outputSlice.ts`
- Tasks slice: `src/renderer/src/store/tasksSlice.ts`
- Task IPC wiring: `src/renderer/src/store/taskListenerMiddleware.ts`
- Block type + ContentBlock: `src/renderer/src/components/ContentBlock.tsx`
- Draft editor hook: `src/renderer/src/hooks/useDraftEditor.ts`
- Page enhancement hook: `src/renderer/src/hooks/useBlockEnhancement.ts`
- Main page: `src/renderer/src/pages/ContentPage.tsx`
- Shared IPC types: `src/shared/types.ts`

## Block Data Model (writingItemsSlice + ContentBlock)
```typescript
interface Block {
  id: string
  type: 'text' | 'heading' | 'media'  // discriminated union
  level?: 1|2|3|4|5|6                 // heading only
  content: string                      // markdown for text; plain text for heading; '' for media
  mediaSrc?: string                    // media only
  mediaAlt?: string                    // media only
  createdAt: string                    // ISO 8601
  updatedAt: string                    // ISO 8601
}
```
Block type is the single source of truth in `ContentBlock.tsx` — both `writingItemsSlice.ts` and `writingsSlice.ts` import it.

## AI Enhancement Architecture (post-refactor)
- `usePageEnhancement` (in `useBlockEnhancement.ts`) is owned by `ContentPage`
- Parent holds `Map<blockId, MutableRefObject<Editor | null>>` via `editorRefsMapRef`
- Each `ContentBlock` reports its editor via `onEditorReady(blockId, editor)` prop
- `ContentBlock` calls `onEnhance(blockId)` — no AI logic inside ContentBlock
- Only one block enhanced at a time; tracked via `enhancingBlockId: string | null`
- Enhancement is cancelled on page unmount

## Persistence (IPC)
- Save: `window.workspace.saveOutput({ type, blocks, metadata })`
- Update: `window.workspace.updateOutput({ type, id, blocks, metadata })`
- Delete: `window.workspace.deleteOutput({ type, id })`
- Load: `window.workspace.loadOutputsByType('writings')`
- Block metadata (type/level/mediaSrc/mediaAlt) serialized as optional fields on blocks
- `OutputFileBlock` in shared types includes `blockType`, `blockLevel`, `mediaSrc`, `mediaAlt`

## useDraftEditor Hook Pattern
- Draft mode: local React state → auto-commit to Redux+disk after 1s when content exists
- Edit mode: reads from Redux, auto-saves to disk 1s after changes
- All CRUD callbacks route to `setDraftBlocks` (draft) or `dispatch(updateEntryBlocks(...))` (edit)
- `focusBlockId` is set on block insert and cleared after one render via useEffect

## Important Anti-patterns to Avoid
- Never call `useEditor` (TipTap) conditionally — extract into a sub-component (`TextBlockEditor`) that only mounts when needed
- Never put AI enhancement logic inside leaf components — keep it at the page level
- Never mutate Redux state directly (Immer via RTK handles this, but be aware of nested arrays)

## TypeScript Config
- Web renderer: `tsconfig.web.json`
- Node/main: `tsconfig.node.json`
- Pre-existing TS error: `@tiptap/react/menus` module resolution (moduleResolution setting mismatch) — NOT our bug
