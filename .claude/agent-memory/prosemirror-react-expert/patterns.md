# ProseEditor – Implementation Patterns

## Schema Construction with @tiptap/pm

```ts
import { Schema } from '@tiptap/pm/model'
import { nodes as basicNodes, marks as basicMarks } from '@tiptap/pm/schema-basic'
import { addListNodes } from '@tiptap/pm/schema-list'

// addListNodes takes an OrderedMap (what basicNodes actually is).
// Cast as any because TS types show plain object but runtime is OrderedMap.
const schema = new Schema({
  nodes: addListNodes(baseNodes as any, 'paragraph block*', 'block'),
  marks: {
    link: { ... },
    em: basicMarks.em,
    strong: basicMarks.strong,
    code: basicMarks.code,
    underline: { parseDOM: [{ tag: 'u' }, ...], toDOM() { return ['u', 0] } },
    strikethrough: { parseDOM: [{ tag: 's' }, ...], toDOM() { return ['s', 0] } },
  },
})
```

## EditorView Lifecycle (React 19)

Use `useLayoutEffect` (not `useEffect`) for EditorView creation to avoid a
flash of unstyled content. The empty dependency array `[]` ensures it runs
once on mount:

```ts
useLayoutEffect(() => {
  const view = new EditorView(containerRef.current, {
    state,
    editable: () => !disabledRef.current,
    dispatchTransaction(tr) {
      const newState = view.state.apply(tr)
      view.updateState(newState)
      if (tr.docChanged) onChange(serializeToHTML(newState.doc))
      updateToolbar(view)
    },
  })
  viewRef.current = view
  return () => { view.destroy(); viewRef.current = null }
}, [])
```

## External Value Sync

Compare HTML strings before replacing to avoid clobbering user's cursor:

```ts
useEffect(() => {
  const view = viewRef.current
  if (!view || view.isDestroyed) return
  if (serializeToHTML(view.state.doc) === value) return
  const newDoc = parseFromHTML(value || '')
  const newState = EditorState.create({
    doc: newDoc, schema, plugins: view.state.plugins,
  })
  view.updateState(newState)
}, [value])
```

## Floating Toolbar Pattern

Keep toolbar position as plain React state `{ show, top, left }`.
Read live mark/node active states directly from `view.state` at render time —
no need to store them in React state.

Render into `document.body` via `createPortal` so the toolbar isn't clipped
by ancestor `overflow: hidden` containers.

Position formula:
```ts
const midX = (startCoords.left + endCoords.right) / 2
const top = startCoords.top - 48  // 48px above the selection
```

## Input Rules

`markInputRule` is not exported by ProseMirror — implement it manually:
```ts
function markInputRule(pattern: RegExp, markType: MarkType) {
  return new InputRule(pattern, (state, match, start, end) => {
    const content = match[1]
    if (!content) return null
    return state.tr.replaceWith(start, start + match[0].length,
      schema.text(content, [markType.create()]))
  })
}
```

## CSS Injection

Inject a single `<style>` tag on first render with a module-level guard:
```ts
let stylesInjected = false
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = PROSE_EDITOR_STYLES
  document.head.appendChild(style)
  stylesInjected = true
}
```
Call `ensureStyles()` at the top of the component render body.
