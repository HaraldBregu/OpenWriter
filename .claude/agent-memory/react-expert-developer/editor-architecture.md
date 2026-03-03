# AppTextEditor Architecture (Mar 2026)

## Files
- `src/renderer/src/components/app/editor/AppTextEditor.tsx` — main editor component
- `src/renderer/src/components/app/editor/extensions/SlashCommand.ts` — slash command PM plugin

## Schema Decision
Standard `Document` is used (NOT the restricted `blockItem+` variant) to support rich block types.
Full block set: Paragraph, Heading(1-3), BulletList, OrderedList, TaskList, Blockquote, CodeBlock, HorizontalRule.

## Installed TipTap Packages (yarn add, Mar 2026)
`@tiptap/core`, `@tiptap/extensions`, `@tiptap/extension-list`, `@tiptap/extension-paragraph`,
`@tiptap/extension-heading`, `@tiptap/extension-blockquote`, `@tiptap/extension-code-block`,
`@tiptap/extension-horizontal-rule`, `@tiptap/extension-bullet-list`, `@tiptap/extension-ordered-list`,
`@tiptap/extension-list-item`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`,
`@tiptap/extension-dropcursor`, `@tiptap/extension-gapcursor`, `@tiptap/extension-highlight`,
`@tiptap/extension-underline`, `@tiptap/extension-typography`

Note: `@tiptap/extension-bullet-list`, `@tiptap/extension-ordered-list`, `@tiptap/extension-task-list`
and `@tiptap/extension-task-item` ALL depend on `@tiptap/extension-list` — install it explicitly.

## TipTap v3 API Changes
- `setContent(html, false)` → `setContent(html, { emitUpdate: false })` — second arg is `SetContentOptions`
- `BubbleMenu` is NOT on root `@tiptap/react` — import from `@tiptap/react/menus`
- `immediatelyRender: false` required in Electron/Vite

## Component Structure
```
AppTextEditor (React.memo + forwardRef) — root, memoizes extraExtensions
  └─ EditorAdapter — owns useEditor, all effects, slash state
       ├─ BubbleMenu (conditional: hidden when slash menu active)
       │    └─ BubbleMenuContent — useEditorState selector for 8 mark/node states
       ├─ div.relative (paddingLeft: 56px gutter)
       │    ├─ BlockControls — hover detection, drag-drop reorder
       │    └─ EditorContent
       ├─ WordCount — useEditorState selector
       └─ SlashCommandMenu — fixed-position portal
```

## SlashCommand Extension
- ProseMirror Plugin (`@tiptap/pm/state`) with `handleKeyDown` + `handleTextInput` props
- `requestAnimationFrame` defers state read until after ProseMirror inserts the `/` character
- Mutable plugin-level `isActive` / `triggerPos` vars avoid React setState on every keypress
- Menu positioned via `view.coordsAtPos(triggerPos)` returning `coords.bottom + 4`
- Arrow/Enter keys: plugin returns `true` (consumed) + `event.stopPropagation()` to prevent PM cursor movement
- `executeSlashCommand()` helper: `deleteRange({ from: triggerPos, to: selection.from })` then runs command

## BlockControls
- Hovered block detection: walk DOM up to `editor.view.dom` direct child, then `posAtDOM(el, 0)`
- Drop reorder: delete source node → `tr.mapping.map(dropPos)` to recalculate target after deletion → insert
- Drag uses transparent ghost image (`position: fixed; top: -9999px`) to suppress browser drag preview
- Drop indicator: `position: absolute` line, shown/hidden via `style.display` (not React state) for perf

## Extension Memoization Strategy
- `BASE_EXTENSIONS` — module-level stable array, NO callbacks inside
- `Placeholder.configure(...)` + `SlashCommand.configure({ onChange })` — per-instance inside `useMemo`
- Consumer `extensions` prop — expected stable reference, passed through to `useMemo` dep

## Props Contract (unchanged from original)
`value`, `onChange`, `placeholder`, `autoFocus`, `className`, `disabled`, `id`,
`extensions`, `streamingContent`, `onAddBelow`, `onDelete`, `onEnhance`
