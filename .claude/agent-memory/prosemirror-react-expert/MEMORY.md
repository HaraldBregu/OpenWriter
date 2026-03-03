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

## ProseEditor (src/renderer/src/components/app/ProseEditor.tsx)
- **Value format**: HTML strings (not markdown). Uses `DOMSerializer`/`DOMParser` from PM schema.
- **Schema**: Built from `prosemirror-schema-basic` nodes + `addListNodes` + custom marks (underline, strikethrough, link)
- **EditorView lifecycle**: Created in `useLayoutEffect([], [])` — destroyed in cleanup. External value synced via separate `useEffect([value])`.
- **Floating toolbar**: Rendered into `document.body` via `createPortal`. Position calculated with `view.coordsAtPos` on every transaction dispatch.
- **Toolbar state**: Only `{show, top, left}` stored in React state. Active mark/node state read directly from `view.state` at render time.
- **Disabled sync**: Re-calls `view.updateState(view.state)` to re-evaluate the `editable` callback.
- **Exported from**: `src/renderer/src/components/app/index.ts`

## Known Patterns
- `addListNodes` from `@tiptap/pm/schema-list` expects an OrderedMap; cast `baseNodes` as `any`.
- `baseKeymap` is exported from `@tiptap/pm/commands` (not `@tiptap/pm/keymap`).
- When rebuilding state to sync external value, preserve `view.state.plugins` to keep all plugins alive.
- `lift` command must be async-imported if used inside a sync callback (dynamic import pattern).

See `patterns.md` for detailed implementation notes.
