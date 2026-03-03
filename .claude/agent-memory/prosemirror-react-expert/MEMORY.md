# ProseEditor – Agent Memory

## Project Context
- **Stack**: Electron + React 19 + TypeScript + Vite
- **ProseMirror access**: All PM modules imported from `@tiptap/pm/*` (re-exports prosemirror-* packages)
  - `@tiptap/pm/state`, `@tiptap/pm/view`, `@tiptap/pm/model`
  - `@tiptap/pm/commands`, `@tiptap/pm/keymap`, `@tiptap/pm/inputrules`
  - `@tiptap/pm/history`, `@tiptap/pm/dropcursor`, `@tiptap/pm/gapcursor`
  - `@tiptap/pm/schema-basic`, `@tiptap/pm/schema-list`
- **Utilities**: `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- **Icons**: lucide-react
- **CSS tokens**: HSL vars — `--foreground`, `--background`, `--border`, `--muted`, `--muted-foreground`, `--primary`, `--popover`, `--accent`

## Component Conventions
- `React.memo` + `React.forwardRef` on all components
- `displayName` always set
- Tailwind for all styles; PM-specific CSS injected once via `<style>` tag in `document.head`

## TextEditor (src/renderer/src/components/app/editor/TextEditor.tsx)
- **Value format**: Markdown strings (NOT HTML). Uses `prosemirror-markdown` for serialization/parsing.
- **Schema**: Tiptap extensions — Bold, Italic, Underline, Strike, BulletList, OrderedList, ListItem, Heading (1-3), History, Placeholder.
- **Markdown input shortcuts**: Already built into Tiptap v3 extensions (no extra extension needed).
  - Bold: `**text**` / `__text__`; Italic: `*text*`; Heading: `# ` `## ` `### `; BulletList: `- `; OrderedList: `1. `
- **Markdown serializer**: Custom `tiptapMarkdownSerializer` maps Tiptap camelCase node names to prosemirror-markdown handlers.
- **Markdown parser**: Custom `tiptapMarkdownParser` maps markdown-it tokens to Tiptap camelCase node/mark names.
- **onChange**: Emits markdown via `tiptapDocToMarkdown(ed.state.doc)`.
- **setContent**: `editor.commands.setContent(doc.toJSON(), { emitUpdate: false, parseOptions: { preserveWhitespace: "full" } })`.
- **Exported from**: `src/renderer/src/components/app/index.ts`

## Tiptap v3 Critical Notes
- `tiptap-markdown` is NOT compatible with Tiptap v3 (v2 only). Do NOT install it.
- `@tiptap/extension-typography` does NOT provide markdown shortcuts — only typographic replacements.
- Tiptap v3 `setContent` signature: `(content, options?: SetContentOptions)` — 2 args only. `emitUpdate` is inside `SetContentOptions`.
- `prosemirror-markdown` IS available as a transitive dependency (no install needed).
- Tiptap camelCase node names: `bulletList`, `orderedList`, `listItem`, `codeBlock`, `hardBreak`, `horizontalRule`.
- `prosemirror-markdown` snake_case names: `bullet_list`, `ordered_list`, `list_item`, `code_block`, `hard_break`, `horizontal_rule`.
- `baseKeymap` is exported from `@tiptap/pm/commands` (not `@tiptap/pm/keymap`).
- When rebuilding state to sync external value, preserve `view.state.plugins` to keep all plugins alive.
- `lift` command must be async-imported if used inside a sync callback (dynamic import pattern).

See `patterns.md` for detailed implementation notes.
