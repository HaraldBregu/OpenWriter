/**
 * ProseEditor — A comprehensive ProseMirror editor wrapper component.
 *
 * Built directly on the ProseMirror core modules (prosemirror-*). This component
 * is intentionally decoupled from TipTap to give full control over the schema,
 * plugins, keybindings, and serialization.
 *
 * Features:
 *  - Rich schema: headings, paragraphs, blockquote, code_block, hr, lists,
 *    images, hard_break; marks: bold, italic, underline, strikethrough, code, link
 *  - Full plugin suite: history, keymap, inputRules, dropCursor, gapCursor,
 *    placeholder decorations
 *  - Custom keybindings for all common formatting operations
 *  - Floating formatting toolbar that appears on text selection
 *  - HTML serialization / deserialization via DOMSerializer / DOMParser
 *  - React 19 compatible (memo + forwardRef)
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
  forwardRef,
  memo,
} from 'react'
import { createPortal } from 'react-dom'

// ── ProseMirror core ──────────────────────────────────────────────────────────
import { Schema, DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model'
import type { Node as PMNode, MarkType, NodeType } from 'prosemirror-model'
import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import {
  toggleMark,
  setBlockType,
  wrapIn,
  chainCommands,
  exitCode,
  joinBackward,
  selectNodeBackward,
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  splitBlock,
  deleteSelection,
  selectAll,
  baseKeymap,
} from 'prosemirror-commands'
import { keymap } from 'prosemirror-keymap'
import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  InputRule,
} from 'prosemirror-inputrules'
import { history, undo, redo } from 'prosemirror-history'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import {
  addListNodes,
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem,
} from 'prosemirror-schema-list'
import { nodes as basicNodes, marks as basicMarks } from 'prosemirror-schema-basic'

// ── Lucide icons ──────────────────────────────────────────────────────────────
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  FileCode,
} from 'lucide-react'

// ── Utilities ─────────────────────────────────────────────────────────────────
import { cn } from '@/lib/utils'

// =============================================================================
// Schema definition
// =============================================================================

/**
 * Build the rich schema from prosemirror-schema-basic nodes/marks, then inject
 * list nodes via addListNodes. We also extend with underline, strikethrough,
 * and link marks that are not present in the basic schema.
 */

const baseNodes = {
  doc: basicNodes.doc,
  paragraph: basicNodes.paragraph,
  text: basicNodes.text,
  hard_break: basicNodes.hard_break,
  horizontal_rule: basicNodes.horizontal_rule,
  code_block: basicNodes.code_block,
  blockquote: basicNodes.blockquote,
  heading: basicNodes.heading,
  image: basicNodes.image,
}

const rawSchema = new Schema({
  nodes: addListNodes(
    // addListNodes expects an OrderedMap; we cast via any because the basic
    // nodes export is already keyed correctly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baseNodes as any,
    'paragraph block*',
    'block',
  ),
  marks: {
    // Core marks from prosemirror-schema-basic
    link: {
      attrs: {
        href: {},
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom: HTMLElement) {
            return {
              href: dom.getAttribute('href'),
              title: dom.getAttribute('title'),
            }
          },
        },
      ],
      toDOM(mark) {
        return ['a', { href: mark.attrs.href as string, title: mark.attrs.title as string }, 0]
      },
    },
    em: basicMarks.em,
    strong: basicMarks.strong,
    code: basicMarks.code,
    // Additional marks not in prosemirror-schema-basic
    underline: {
      parseDOM: [
        { tag: 'u' },
        {
          style: 'text-decoration',
          getAttrs: (value: string) => (value === 'underline' ? {} : false),
        },
      ],
      toDOM() {
        return ['u', 0]
      },
    },
    strikethrough: {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        {
          style: 'text-decoration',
          getAttrs: (value: string) => (value === 'line-through' ? {} : false),
        },
      ],
      toDOM() {
        return ['s', 0]
      },
    },
  },
})

// Convenience reference into the compiled schema
const schema = rawSchema

// =============================================================================
// HTML ↔ ProseMirror helpers
// =============================================================================

/** Serialize a ProseMirror document node to an HTML string. */
function serializeToHTML(doc: PMNode): string {
  const serializer = DOMSerializer.fromSchema(schema)
  const fragment = serializer.serializeFragment(doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

/** Parse an HTML string into a ProseMirror document node. */
function parseFromHTML(html: string): PMNode {
  const div = document.createElement('div')
  div.innerHTML = html
  return PMDOMParser.fromSchema(schema).parse(div)
}

// =============================================================================
// Placeholder plugin
// =============================================================================

const placeholderPluginKey = new PluginKey<DecorationSet>('placeholder')

function buildPlaceholderPlugin(placeholder: string): Plugin {
  return new Plugin({
    key: placeholderPluginKey,
    props: {
      decorations(state) {
        const doc = state.doc
        // Only show when the document is a single empty paragraph
        if (
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild.content.size === 0
        ) {
          const decoration = Decoration.node(0, doc.content.size, {
            'data-placeholder': placeholder,
            class: 'prose-editor-placeholder',
          })
          return DecorationSet.create(doc, [decoration])
        }
        return DecorationSet.empty
      },
    },
  })
}

// =============================================================================
// Input rules
// =============================================================================

/**
 * Build a markInputRule that toggles a mark when the user wraps text in a
 * delimiter (e.g., **bold**, `code`).
 * ProseMirror's built-in markInputRule handles this pattern.
 */
function markInputRule(pattern: RegExp, markType: MarkType) {
  return new InputRule(pattern, (state, match, start, end) => {
    const [fullMatch, content] = match
    if (!fullMatch || !content) return null
    const tr = state.tr
    const markStart = start
    const markEnd = start + fullMatch.length
    tr.replaceWith(markStart, markEnd, schema.text(content, [markType.create()]))
    return tr
  })
}

function buildInputRules(): Plugin {
  const rules = [
    // ## Heading (h1–h6)
    textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, (match) => ({
      level: match[1].length,
    })),
    // > Blockquote
    wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
    // ``` Code block
    textblockTypeInputRule(/^```$/, schema.nodes.code_block),
    // --- Horizontal rule
    new InputRule(/^---$/, (state, _match, start, end) => {
      const tr = state.tr
      tr.replaceRangeWith(start, end, schema.nodes.horizontal_rule.create())
      return tr
    }),
    // - or * Bullet list
    wrappingInputRule(/^\s*([-*])\s$/, schema.nodes.bullet_list),
    // 1. Ordered list
    wrappingInputRule(/^\s*(\d+)\.\s$/, schema.nodes.ordered_list, (match) => ({
      order: +match[1],
    })),
    // **bold**
    markInputRule(/\*\*([^*]+)\*\*$/, schema.marks.strong),
    // _italic_ or *italic*
    markInputRule(/(?:^|[^_])_([^_]+)_$/, schema.marks.em),
    markInputRule(/(?:^|[^*])\*([^*]+)\*$/, schema.marks.em),
    // `code`
    markInputRule(/`([^`]+)`$/, schema.marks.code),
    // ~~strikethrough~~
    markInputRule(/~~([^~]+)~~$/, schema.marks.strikethrough),
  ]

  return inputRules({ rules })
}

// =============================================================================
// Keymap
// =============================================================================

function buildCustomKeymap() {
  const { nodes: n, marks: m } = schema

  // List helpers need the right item type from our schema
  const listItemType: NodeType = n.list_item

  return keymap({
    // Formatting marks
    'Mod-b': toggleMark(m.strong),
    'Mod-i': toggleMark(m.em),
    'Mod-u': toggleMark(m.underline),
    'Mod-`': toggleMark(m.code),
    'Mod-Shift-s': toggleMark(m.strikethrough),

    // History
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,

    // List indentation
    Tab: sinkListItem(listItemType),
    'Shift-Tab': liftListItem(listItemType),

    // Enter in list item splits it; Enter in code block inserts newline
    Enter: chainCommands(
      newlineInCode,
      splitListItem(listItemType),
      createParagraphNear,
      liftEmptyBlock,
      splitBlock,
    ),

    // Backspace handling for lists
    Backspace: chainCommands(deleteSelection, joinBackward, selectNodeBackward),

    // Standard exit-code-block shortcut
    'Mod-Enter': exitCode,

    // Select all
    'Mod-a': selectAll,
  })
}

// =============================================================================
// All plugins combined
// =============================================================================

function buildPlugins(placeholder: string): Plugin[] {
  return [
    history(),
    buildInputRules(),
    buildCustomKeymap(),
    keymap(baseKeymap),
    dropCursor({ color: 'hsl(var(--primary))' }),
    gapCursor(),
    buildPlaceholderPlugin(placeholder),
  ]
}

// =============================================================================
// Floating toolbar state
// =============================================================================

interface ToolbarState {
  show: boolean
  top: number
  left: number
}

const HIDDEN_TOOLBAR: ToolbarState = { show: false, top: 0, left: 0 }

// =============================================================================
// Mark / node active helpers (used by the toolbar)
// =============================================================================

function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { from, $from, to, empty } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, markType)
}

function isNodeActive(
  state: EditorState,
  nodeType: NodeType,
  attrs?: Record<string, unknown>,
): boolean {
  const { $from, to } = state.selection
  let found = false
  state.doc.nodesBetween($from.pos, to, (node) => {
    if (node.type === nodeType) {
      if (!attrs) {
        found = true
        return false
      }
      const matches = Object.entries(attrs).every(
        ([key, val]) => node.attrs[key as keyof typeof node.attrs] === val,
      )
      if (matches) found = true
    }
  })
  return found
}

// =============================================================================
// Floating Toolbar component
// =============================================================================

interface FloatingToolbarProps {
  editorView: EditorView | null
  toolbarState: ToolbarState
  container: HTMLElement | null
}

const FloatingToolbar = memo(
  ({ editorView, toolbarState, container }: FloatingToolbarProps): React.JSX.Element | null => {
    const [editorStateSnapshot, setEditorStateSnapshot] = useState<EditorState | null>(null)

    useEffect(() => {
      if (!editorView) return
      // Capture current state when toolbar becomes visible
      if (toolbarState.show) {
        setEditorStateSnapshot(editorView.state)
      }
    }, [editorView, toolbarState.show])

    // Keep active states fresh when toolbar is visible
    useEffect(() => {
      if (!editorView || !toolbarState.show) return
      setEditorStateSnapshot(editorView.state)
    }, [editorView, toolbarState])

    if (!toolbarState.show || !editorView || !container) return null

    const state = editorStateSnapshot ?? editorView.state
    const { nodes: n, marks: m } = schema

    const btn = 'p-1.5 rounded transition-colors cursor-pointer select-none'
    const btnActive = 'bg-foreground text-background'
    const btnIdle = 'text-foreground/70 hover:bg-muted hover:text-foreground'

    const run = (fn: () => void) => (e: React.MouseEvent) => {
      e.preventDefault()
      fn()
      editorView.focus()
    }

    const toggleMarkCmd = (markType: MarkType) =>
      run(() => toggleMark(markType)(editorView.state, editorView.dispatch))

    const toggleHeading = (level: number) =>
      run(() => {
        const cmd = isNodeActive(editorView.state, n.heading, { level })
          ? setBlockType(n.paragraph)
          : setBlockType(n.heading, { level })
        cmd(editorView.state, editorView.dispatch)
      })

    const toggleList = (listType: NodeType) =>
      run(() => {
        if (isNodeActive(editorView.state, listType)) {
          // If already in this list, use setBlockType on paragraph to unwrap
          // (simplified: just toggle off by wrapping again will do nothing,
          // so we lift out)
          liftListItem(n.list_item)(editorView.state, editorView.dispatch)
        } else {
          wrapInList(listType)(editorView.state, editorView.dispatch)
        }
      })

    const toggleBlockquote = run(() => {
      if (isNodeActive(editorView.state, n.blockquote)) {
        // Lift out of blockquote: use the lift command
        import('prosemirror-commands').then(({ lift }) => {
          lift(editorView.state, editorView.dispatch)
        })
      } else {
        wrapIn(n.blockquote)(editorView.state, editorView.dispatch)
      }
    })

    const toggleCodeBlock = run(() => {
      if (isNodeActive(editorView.state, n.code_block)) {
        setBlockType(n.paragraph)(editorView.state, editorView.dispatch)
      } else {
        setBlockType(n.code_block)(editorView.state, editorView.dispatch)
      }
    })

    const insertLink = run(() => {
      const { from, to, empty } = editorView.state.selection
      if (empty) return
      const href = window.prompt('Enter URL:')
      if (!href) return
      const tr = editorView.state.tr.addMark(from, to, m.link.create({ href }))
      editorView.dispatch(tr)
    })

    const toolbarContent = (
      <div
        style={{ position: 'fixed', top: toolbarState.top, left: toolbarState.left, zIndex: 50 }}
        onMouseDown={(e) => e.preventDefault()}
        className="flex items-center gap-px rounded-lg border border-border bg-popover shadow-md p-1"
      >
        {/* Headings */}
        <button
          type="button"
          onClick={toggleHeading(1)}
          className={cn(btn, isNodeActive(state, n.heading, { level: 1 }) ? btnActive : btnIdle)}
          title="Heading 1"
        >
          <Heading1 size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleHeading(2)}
          className={cn(btn, isNodeActive(state, n.heading, { level: 2 }) ? btnActive : btnIdle)}
          title="Heading 2"
        >
          <Heading2 size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleHeading(3)}
          className={cn(btn, isNodeActive(state, n.heading, { level: 3 }) ? btnActive : btnIdle)}
          title="Heading 3"
        >
          <Heading3 size={15} strokeWidth={2} />
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Inline marks */}
        <button
          type="button"
          onClick={toggleMarkCmd(m.strong)}
          className={cn(btn, isMarkActive(state, m.strong) ? btnActive : btnIdle)}
          title="Bold (Mod-B)"
        >
          <Bold size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={toggleMarkCmd(m.em)}
          className={cn(btn, isMarkActive(state, m.em) ? btnActive : btnIdle)}
          title="Italic (Mod-I)"
        >
          <Italic size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleMarkCmd(m.underline)}
          className={cn(btn, isMarkActive(state, m.underline) ? btnActive : btnIdle)}
          title="Underline (Mod-U)"
        >
          <Underline size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleMarkCmd(m.strikethrough)}
          className={cn(
            btn,
            isMarkActive(state, m.strikethrough) ? btnActive : btnIdle,
          )}
          title="Strikethrough (Mod-Shift-S)"
        >
          <Strikethrough size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleMarkCmd(m.code)}
          className={cn(btn, isMarkActive(state, m.code) ? btnActive : btnIdle)}
          title="Inline Code (Mod-`)"
        >
          <Code size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={insertLink}
          className={cn(btn, isMarkActive(state, m.link) ? btnActive : btnIdle)}
          title="Link"
        >
          <Link size={15} strokeWidth={2} />
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Block types */}
        <button
          type="button"
          onClick={toggleList(n.bullet_list)}
          className={cn(btn, isNodeActive(state, n.bullet_list) ? btnActive : btnIdle)}
          title="Bullet List"
        >
          <List size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleList(n.ordered_list)}
          className={cn(btn, isNodeActive(state, n.ordered_list) ? btnActive : btnIdle)}
          title="Ordered List"
        >
          <ListOrdered size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleBlockquote}
          className={cn(btn, isNodeActive(state, n.blockquote) ? btnActive : btnIdle)}
          title="Blockquote"
        >
          <Quote size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={toggleCodeBlock}
          className={cn(btn, isNodeActive(state, n.code_block) ? btnActive : btnIdle)}
          title="Code Block"
        >
          <FileCode size={15} strokeWidth={2} />
        </button>
      </div>
    )

    return createPortal(toolbarContent, document.body)
  },
)
FloatingToolbar.displayName = 'FloatingToolbar'

// =============================================================================
// ProseEditor styles — injected once via a <style> tag
// =============================================================================

const PROSE_EDITOR_STYLES = `
/* Placeholder text */
.prose-editor-placeholder[data-placeholder]::before {
  content: attr(data-placeholder);
  float: left;
  pointer-events: none;
  height: 0;
  color: hsl(var(--muted-foreground));
  font-style: normal;
}

/* ProseMirror base */
.prose-editor .ProseMirror {
  outline: none;
  min-height: 200px;
  padding: 0.5rem 0;
  line-height: 1.75;
  color: hsl(var(--foreground));
  caret-color: hsl(var(--foreground));
  word-break: break-words;
  white-space: pre-wrap;
}

/* Headings */
.prose-editor .ProseMirror h1 {
  font-size: 2em;
  font-weight: 700;
  line-height: 1.2;
  margin: 0.75em 0 0.4em;
  color: hsl(var(--foreground));
}
.prose-editor .ProseMirror h2 {
  font-size: 1.5em;
  font-weight: 600;
  line-height: 1.3;
  margin: 0.7em 0 0.35em;
  color: hsl(var(--foreground));
}
.prose-editor .ProseMirror h3 {
  font-size: 1.25em;
  font-weight: 600;
  line-height: 1.35;
  margin: 0.65em 0 0.3em;
  color: hsl(var(--foreground));
}
.prose-editor .ProseMirror h4 {
  font-size: 1.1em;
  font-weight: 600;
  line-height: 1.4;
  margin: 0.6em 0 0.25em;
  color: hsl(var(--foreground));
}
.prose-editor .ProseMirror h5,
.prose-editor .ProseMirror h6 {
  font-size: 1em;
  font-weight: 600;
  line-height: 1.5;
  margin: 0.5em 0 0.2em;
  color: hsl(var(--foreground));
}

/* Paragraph */
.prose-editor .ProseMirror p {
  margin: 0.35em 0;
}

/* Blockquote */
.prose-editor .ProseMirror blockquote {
  border-left: 3px solid hsl(var(--border));
  margin: 0.75em 0;
  padding: 0.25em 0 0.25em 1em;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

/* Inline code */
.prose-editor .ProseMirror code {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  border-radius: 3px;
  padding: 0.15em 0.35em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875em;
}

/* Code block */
.prose-editor .ProseMirror pre {
  background: hsl(var(--muted));
  border-radius: 6px;
  padding: 0.85em 1em;
  margin: 0.75em 0;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875em;
  line-height: 1.6;
}
.prose-editor .ProseMirror pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

/* Lists */
.prose-editor .ProseMirror ul,
.prose-editor .ProseMirror ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.prose-editor .ProseMirror ul {
  list-style-type: disc;
}
.prose-editor .ProseMirror ol {
  list-style-type: decimal;
}
.prose-editor .ProseMirror li {
  margin: 0.2em 0;
}
.prose-editor .ProseMirror li > p {
  margin: 0;
}

/* Horizontal rule */
.prose-editor .ProseMirror hr {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: 1.25em 0;
}

/* Links */
.prose-editor .ProseMirror a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.prose-editor .ProseMirror a:hover {
  opacity: 0.8;
}

/* Images */
.prose-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
  margin: 0.75em 0;
}

/* Selected node */
.prose-editor .ProseMirror .ProseMirror-selectednode {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Gap cursor */
.prose-editor .ProseMirror .ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
}
.prose-editor .ProseMirror .ProseMirror-gapcursor::after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid hsl(var(--foreground));
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}
@keyframes ProseMirror-cursor-blink {
  to { visibility: hidden; }
}
.prose-editor .ProseMirror.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}
`

/** Injects the shared <style> tag once per page load. */
let stylesInjected = false
function ensureStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.setAttribute('data-prose-editor', 'true')
  style.textContent = PROSE_EDITOR_STYLES
  document.head.appendChild(style)
  stylesInjected = true
}

// =============================================================================
// ProseEditorProps
// =============================================================================

export interface ProseEditorProps {
  /** HTML content */
  value: string
  /** Called with the new HTML value on every change */
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

// =============================================================================
// ProseEditor — main component
// =============================================================================

/**
 * A comprehensive ProseMirror editor built directly on PM core packages
 * (prosemirror-* packages). Supports rich text with a floating toolbar,
 * input-rule auto-formatting, and full keyboard shortcuts.
 *
 * Props use HTML strings for `value` / `onChange` so the component is a
 * drop-in for any HTML-aware store.
 */
const ProseEditor = memo(
  forwardRef<HTMLDivElement, ProseEditorProps>((props, ref) => {
    const {
      value,
      onChange,
      placeholder = 'Write something…',
      autoFocus = false,
      disabled = false,
      className,
      id,
    } = props

    // Refs that survive renders without triggering them
    const containerRef = useRef<HTMLDivElement | null>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    const valueRef = useRef(value)

    // Keep stable refs to latest values
    onChangeRef.current = onChange
    valueRef.current = value

    // Toolbar positioning state — only the position data lives in React state
    const [toolbarState, setToolbarState] = useState<ToolbarState>(HIDDEN_TOOLBAR)

    // Ensure CSS is injected once
    ensureStyles()

    // ── Toolbar position calculator ──────────────────────────────────────────

    const updateToolbar = useCallback((view: EditorView) => {
      const { selection } = view.state
      const { empty, from, to } = selection

      if (empty || !(selection instanceof TextSelection)) {
        setToolbarState(HIDDEN_TOOLBAR)
        return
      }

      try {
        const startCoords = view.coordsAtPos(from)
        const endCoords = view.coordsAtPos(to)

        // Center the toolbar horizontally over the selection midpoint
        const midX = (startCoords.left + endCoords.right) / 2
        const top = startCoords.top - 48 // 48px above selection
        const TOOLBAR_WIDTH_ESTIMATE = 340

        setToolbarState({
          show: true,
          top: Math.max(8, top),
          left: Math.max(8, midX - TOOLBAR_WIDTH_ESTIMATE / 2),
        })
      } catch {
        setToolbarState(HIDDEN_TOOLBAR)
      }
    }, [])

    // ── Create EditorView once on mount ─────────────────────────────────────

    useLayoutEffect(() => {
      if (!containerRef.current) return

      const initialDoc = parseFromHTML(value || '')
      const state = EditorState.create({
        doc: initialDoc,
        schema,
        plugins: buildPlugins(placeholder),
      })

      const view = new EditorView(containerRef.current, {
        state,
        editable: () => !disabled,
        dispatchTransaction(tr: Transaction) {
          const newState = view.state.apply(tr)
          view.updateState(newState)

          // Notify React of content changes
          if (tr.docChanged) {
            const html = serializeToHTML(newState.doc)
            valueRef.current = html
            onChangeRef.current(html)
          }

          // Update floating toolbar after every transaction
          updateToolbar(view)
        },
      })

      viewRef.current = view

      if (autoFocus) {
        // Defer to next tick to let the DOM settle
        Promise.resolve().then(() => {
          if (!view.isDestroyed) {
            view.focus()
            const { doc } = view.state
            const tr = view.state.tr.setSelection(
              TextSelection.atStart(doc),
            )
            view.dispatch(tr)
          }
        })
      }

      return () => {
        view.destroy()
        viewRef.current = null
        setToolbarState(HIDDEN_TOOLBAR)
      }
      // We intentionally run this only on mount. External changes to `value`
      // are handled by the separate sync effect below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Sync external `value` changes into ProseMirror ──────────────────────

    useEffect(() => {
      const view = viewRef.current
      if (!view || view.isDestroyed) return

      const currentHTML = serializeToHTML(view.state.doc)
      // Avoid a costly replace when the content is identical
      if (currentHTML === value) return

      const newDoc = parseFromHTML(value || '')
      const newState = EditorState.create({
        doc: newDoc,
        schema,
        plugins: view.state.plugins,
        // Preserve selection approximately by using the start
      })
      view.updateState(newState)
    }, [value])

    // ── Sync `disabled` prop ─────────────────────────────────────────────────

    useEffect(() => {
      const view = viewRef.current
      if (!view || view.isDestroyed) return
      // Trigger a no-op state update so editable() is re-evaluated
      view.updateState(view.state)
    }, [disabled])

    // ── Sync `placeholder` changes ───────────────────────────────────────────

    useEffect(() => {
      const view = viewRef.current
      if (!view || view.isDestroyed) return
      // Rebuild plugins with new placeholder and reinstall
      const newState = EditorState.create({
        doc: view.state.doc,
        schema,
        plugins: buildPlugins(placeholder),
        selection: view.state.selection,
      })
      view.updateState(newState)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [placeholder])

    // ── Hide toolbar on clicks outside the editor ────────────────────────────

    useEffect(() => {
      const handlePointerDown = (e: PointerEvent) => {
        // If the click is outside our editor container, hide the toolbar
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setToolbarState(HIDDEN_TOOLBAR)
        }
      }
      document.addEventListener('pointerdown', handlePointerDown)
      return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [])

    // ── Merge refs ───────────────────────────────────────────────────────────

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.RefObject<HTMLDivElement | null>).current = node
        }
      },
      [ref],
    )

    return (
      <>
        <div
          id={id}
          ref={mergedRef}
          className={cn('prose-editor w-full', className)}
          aria-disabled={disabled}
        />
        <FloatingToolbar
          editorView={viewRef.current}
          toolbarState={toolbarState}
          container={containerRef.current}
        />
      </>
    )
  }),
)

ProseEditor.displayName = 'ProseEditor'

export { ProseEditor }
