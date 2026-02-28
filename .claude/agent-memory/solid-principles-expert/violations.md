# SOLID Violations — OpenWriter Renderer (2026-02-25)

## CRITICAL: Single Responsibility Principle

### 1. AppLayout.tsx — 5+ Responsibilities in One Component
**File**: `src/renderer/src/components/AppLayout.tsx` (715 lines)
**Lines**: 202–715 (`AppLayoutInner`)

Responsibilities mixed together:
1. Sidebar layout rendering (HTML structure)
2. Post context menu action handling (open, duplicate, rename, delete) — lines 270–343
3. Writing context menu action handling — lines 345–407
4. Workspace name loading — lines 220–239
5. Section collapse toggle state management — lines 210–215
6. Navigation decisions (where to go after delete) — lines 334, 398

**Impact**: Any change to context menu behavior, navigation logic, or workspace loading triggers a re-read of this 715-line file. Impossible to unit test any one concern in isolation.

**Refactoring**: Extract:
- `usePostContextMenu(posts, navigate, dispatch)` hook (lines 270–343)
- `useWritingContextMenu(writings, navigate, dispatch)` hook (lines 345–407)
- `useWorkspaceName()` hook (lines 220–239)
- `SidebarNav` component (the JSX-heavy sidebar rendering)

---

### 2. NewPostPage.tsx / ContentPage.tsx — Duplicated Responsibilities
**Files**:
- `src/renderer/src/pages/NewPostPage.tsx` (437 lines)
- `src/renderer/src/pages/ContentPage.tsx` (446 lines)

These two files are structurally identical:
- Draft mode management (lines 44–82 in each)
- Draft commit on first content (useEffect, lines 100–152)
- Auto-save in edit mode with debounce (lines 155–212)
- Block CRUD handlers: change, delete, addAfter, reorder (lines 213–271)
- Draft block CRUD handlers (lines 244–267)
- AI settings change handler (lines 269–285)
- Rendering: identical header, content area, sidebar, footer

**Impact**: Any bug fix or feature change must be applied twice. DRY violation creates drift risk.

**Refactoring**: Extract shared `useEditorPage({ type, slice actions })` hook for all state management, and a shared `EditorPageLayout` component for the UI.

---

### 3. AppContext.tsx — 6 Concerns in One Context
**File**: `src/renderer/src/contexts/AppContext.tsx` (422 lines)

Manages in a single context:
1. Theme mode (read, write, persist, DOM side effects, IPC sync, OS media query) — lines 78–115, 247–285
2. User authentication state — lines 49, 218
3. UI preferences (font size, line height, spell check, etc.) — lines 17–25, 287–307
4. Modal open/close state — lines 28–32, 135–143
5. Online/offline network detection — lines 233–245
6. Last sync timestamp — lines 39, 149–151

**Impact**: A component needing only theme mode still subscribes to the entire `AppState` and re-renders when modals change. This is the ISP violation as well.

**Refactoring**: Split into focused contexts: `ThemeContext`, `UserContext`, `UIPreferencesContext`, `ModalContext`, `NetworkContext`. Each can have its own Provider and hook.

---

## CRITICAL: Dependency Inversion Principle

### 4. PersonalityTaskContext.tsx — Hard Dependency on Window Globals
**File**: `src/renderer/src/contexts/PersonalityTaskContext.tsx` (492 lines)

The context directly accesses Electron IPC through global `window` references:
- `window.task.onEvent(...)` — line 189
- `window.task.submit(...)` — line 334
- `window.task.cancel(...)` — line 372
- `window.personality.save(...)` — line 158
- `window.store.getModelSettings(...)` — line 150

**Impact**: This context cannot be tested without mocking `window.task` and `window.personality` globals. Any change in the IPC API shape breaks this file directly. The abstraction boundary (preload) is bypassed in the component logic.

**Refactoring**: Introduce a `IPersonalityTaskService` interface and inject it as a prop or via a dedicated context. The concrete implementation wraps `window.task` / `window.personality`. Tests inject a mock service.

---

## HIGH: Open/Closed Principle

### 5. postsSlice.ts extraReducers — Brittle String Matching
**File**: `src/renderer/src/store/postsSlice.ts` (lines 200–280)

```ts
builder.addMatcher(
  (action): action is PayloadAction<OutputItem[]> =>
    action.type === 'output/loadAll/fulfilled',   // ← hardcoded string
  (state, action) => { ... }
)
```

This bypasses RTK's type-safe `addCase` / `addMatcher` patterns specifically to avoid a circular import. The string `'output/loadAll/fulfilled'` will silently break if the slice name or thunk name changes.

**Impact**: Renaming or refactoring the output slice breaks post hydration silently. No TypeScript protection.

**Refactoring**: Move the cross-slice hydration logic to a separate `postsHydration.ts` utility, imported by `store/index.ts` which can import both slices without a cycle.

---

### 6. postsSyncMiddleware.ts — Action-Type String Prefix Matching
**File**: `src/renderer/src/store/middleware/postsSync.middleware.ts` (lines 195–203)

```ts
if (actionType.startsWith('posts/')) {
  if (
    actionType === 'posts/handleExternalPostChange' ||
    actionType === 'posts/handleExternalPostDelete' ||
    actionType === 'posts/loadPosts'
  ) { return result }
```

Allowlist and blocklist of action type strings. Adding a new action to postsSlice that should NOT trigger sync requires modifying this middleware (OCP violation — closed for extension, open for modification).

**Impact**: Easy to accidentally sync when a new action is added to postsSlice that should be excluded.

**Refactoring**: Use explicit action matchers from postsSlice exports: `isAnyOf(createPost, updatePostBlocks, ...)` on the actions that SHOULD trigger sync. New internal-only actions are safe by default.

---

## HIGH: Single Responsibility Principle

### 7. ContentBlock.tsx — Editor + AI Enhancement + Drag + Block Actions
**File**: `src/renderer/src/components/ContentBlock.tsx` (389 lines)

The component manages:
1. TipTap editor initialization and sync (lines 117–179)
2. AI enhance streaming (window.task.onEvent subscription, lines 182–198)
3. Task lifecycle management (useTask hook, taskId state, lines 200–241)
4. Drag-and-drop control (framer-motion dragControls, line 93)
5. Block action buttons (copy, delete, enhance)
6. Empty state / placeholder rendering

**Impact**: Changing the AI enhancement flow, drag behavior, or editor configuration each require modifying the same large component.

**Refactoring**: Extract `useBlockEnhancement(editor, submitTask, cancelTask)` hook for all AI enhancement logic.

---

## MEDIUM: Interface Segregation / DRY

### 8. DocumentCard / DocumentListItem — Duplicated Dropdown Logic
**File**: `src/renderer/src/pages/DocumentsPage.tsx`
- `DocumentCard` (lines 254–313)
- `DocumentListItem` (lines 321–378)

Both components contain an identical `AppDropdownMenu` with the same three actions: View, Copy Path, Delete. The only difference between the two components is their layout (grid card vs. list row).

**Refactoring**: Extract `DocumentActionMenu` component accepting `{ onView, onDelete }`. Each display component renders this shared menu.

---

### 9. PersonalitySimpleLayout.tsx — Hardcoded Section Union Type
**File**: `src/renderer/src/components/personality/PersonalitySimpleLayout.tsx` (line 59)

```ts
const files = useAppSelector(
  selectPersonalityFilesBySection(sectionId as 'emotional-depth' | 'consciousness' | 'motivation' | 'moral-intuition' | 'irrationality' | 'growth' | 'social-identity' | 'creativity' | 'mortality' | 'contradiction')
)
```

The cast forces every consumer of `PersonalitySimpleLayout` to be aware of the full set of personality sections. Adding a new section requires updating the selector's type parameter here.

**Refactoring**: Export `PersonalitySectionId` type from `personalityFilesSlice` and use it in the selector signature. The cast becomes a type assertion against the exported type.
