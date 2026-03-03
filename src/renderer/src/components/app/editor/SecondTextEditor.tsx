/**
 * SecondTextEditor — Structured Tiptap v3 editor with custom Document schema.
 *
 * Architecture:
 *  - Custom Document node enforcing: title (h1) + body (block container)
 *  - Custom Title node: always-present h1, cannot be deleted
 *  - Custom Body node: wraps all body content, structural only
 *  - Custom Callout node: admonition blocks (info / warning / success / error)
 *  - Custom Details node: collapsible <details>/<summary> toggle blocks
 *  - TrailingNode extension: ensures a trailing empty paragraph in body
 *  - UniqueID extension: stamps data-id on every block node
 *  - KeyboardShortcuts extension: Mod-Shift-c / Mod-Shift-t / Mod-Shift-h
 *
 * All custom nodes and extensions are defined in this file.
 * The only external project import is `cn` from `@/lib/utils`.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import {
  useEditor,
  EditorContent,
  type UseEditorOptions,
} from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Node,
  Extension,
  type AnyExtension,
  mergeAttributes,
} from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// ── Standard extensions ────────────────────────────────────────────────────
import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Heading from '@tiptap/extension-heading'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'

// ── Lucide icons ───────────────────────────────────────────────────────────
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Code as CodeIcon,
  Underline as UnderlineIcon,
  Highlighter,
  Heading2,
  Quote,
} from 'lucide-react'

import { cn } from '@/lib/utils'

// ===========================================================================
// Types
// ===========================================================================

export interface SecondTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
}

type CalloutType = 'info' | 'warning' | 'success' | 'error'

// ===========================================================================
// Custom Document Node
// Enforces schema: title body
// ===========================================================================

const CustomDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: 'title body',
})

// ===========================================================================
// Title Node
// Always-present h1 at the top of the document.
// ===========================================================================

const TitleNode = Node.create({
  name: 'title',
  content: 'inline*',
  marks: '',
  group: '',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'h1[data-title]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'h1',
      mergeAttributes(HTMLAttributes, {
        'data-title': 'true',
        class:
          'text-4xl font-bold mb-4 outline-none break-words',
      }),
      0,
    ]
  },

  addKeyboardShortcuts() {
    return {
      // Tab moves focus from title into the body.
      Tab: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $anchor } = selection
        // Check if we are inside the title node.
        if ($anchor.node(1)?.type.name === 'title') {
          return editor.commands.focus('end')
        }
        return false
      },
      // Prevent Enter from splitting/leaving the title node in a way
      // that breaks the document structure — instead, move to body.
      Enter: ({ editor }) => {
        const { state } = editor
        const { $anchor } = state.selection
        if ($anchor.node(1)?.type.name === 'title') {
          // Move cursor to the start of the body.
          const titleNode = state.doc.firstChild
          if (!titleNode) return false
          const bodyStart = titleNode.nodeSize + 1
          editor.commands.setTextSelection(bodyStart)
          return true
        }
        return false
      },
    }
  },
})

// ===========================================================================
// Body Node
// Structural wrapper for all body content. Not user-toggleable.
// ===========================================================================

const BodyNode = Node.create({
  name: 'body',
  content: 'block+',
  group: '',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-body]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-body': 'true',
      }),
      0,
    ]
  },
})

// ===========================================================================
// Callout Node
// Admonition block with type: info | warning | success | error
// ===========================================================================

interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>
}

const CALLOUT_CONFIG: Record<
  CalloutType,
  { label: string; borderColor: string; bgColor: string; iconColor: string }
> = {
  info: {
    label: 'Info',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-500',
  },
  warning: {
    label: 'Warning',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-500',
  },
  success: {
    label: 'Success',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-500',
  },
  error: {
    label: 'Error',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-500',
  },
}

function calloutIconSvg(type: CalloutType): string {
  // Inline SVG paths for each type (lucide-react paths).
  const paths: Record<CalloutType, string> = {
    info: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v4m0 4h.01',
    warning:
      'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
    success:
      'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    error:
      'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM15 9l-6 6M9 9l6 6',
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[type]}"/></svg>`
}

const CalloutNode = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element) =>
          (element.getAttribute('data-callout-type') as CalloutType) ?? 'info',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes['type'],
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const calloutType = (node.attrs['type'] as CalloutType) ?? 'info'
    const cfg = CALLOUT_CONFIG[calloutType]
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-callout': 'true',
        class: cn(
          'flex gap-3 rounded-md border-l-4 p-4 my-2',
          cfg.borderColor,
          cfg.bgColor,
        ),
      }),
      // Icon wrapper
      [
        'div',
        {
          class: cn('mt-0.5 shrink-0', cfg.iconColor),
          'aria-hidden': 'true',
          innerHTML: calloutIconSvg(calloutType),
        },
      ],
      // Content wrapper
      ['div', { class: 'flex-1 min-w-0' }, 0],
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const calloutType = (node.attrs['type'] as CalloutType) ?? 'info'
      const cfg = CALLOUT_CONFIG[calloutType]

      // Outer wrapper
      const dom = document.createElement('div')
      dom.setAttribute('data-callout', 'true')
      dom.setAttribute('data-callout-type', calloutType)
      dom.className = cn(
        'flex gap-3 rounded-md border-l-4 p-4 my-2',
        cfg.borderColor,
        cfg.bgColor,
      )

      // Icon
      const iconEl = document.createElement('div')
      iconEl.className = cn('mt-0.5 shrink-0', cfg.iconColor)
      iconEl.setAttribute('aria-hidden', 'true')
      iconEl.innerHTML = calloutIconSvg(calloutType)
      dom.appendChild(iconEl)

      // Type selector dropdown (top-right, shown on hover)
      const typeSelect = document.createElement('select')
      typeSelect.className =
        'absolute top-2 right-2 text-xs bg-transparent border border-border rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-foreground'
      typeSelect.setAttribute('aria-label', 'Callout type')
      ;(['info', 'warning', 'success', 'error'] as CalloutType[]).forEach((t) => {
        const opt = document.createElement('option')
        opt.value = t
        opt.textContent = CALLOUT_CONFIG[t].label
        if (t === calloutType) opt.selected = true
        typeSelect.appendChild(opt)
      })
      typeSelect.addEventListener('change', (e) => {
        const newType = (e.target as HTMLSelectElement).value as CalloutType
        if (typeof getPos === 'function') {
          editor.chain().focus().command(({ tr }) => {
            tr.setNodeMarkup(getPos(), undefined, { type: newType })
            return true
          }).run()
        }
      })

      // Content area (ProseMirror mounts here)
      const contentEl = document.createElement('div')
      contentEl.className = 'flex-1 min-w-0 relative group'
      contentEl.appendChild(typeSelect)
      dom.appendChild(contentEl)

      // Make outer clickable for focus
      dom.addEventListener('mousedown', (e) => {
        // Don't intercept clicks on the select element
        if (e.target === typeSelect) return
      })

      return {
        dom,
        contentDOM: contentEl,
        update(updatedNode) {
          if (updatedNode.type.name !== 'callout') return false
          const newType = (updatedNode.attrs['type'] as CalloutType) ?? 'info'
          if (newType !== calloutType) {
            // Return false to force full re-render when type changes
            return false
          }
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setCallout:
        (attrs: { type?: CalloutType } = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs)
        },
      toggleCallout:
        (attrs: { type?: CalloutType } = {}) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs)
        },
    } as Record<string, (...args: unknown[]) => unknown>
  },
})

// ===========================================================================
// Details Node
// Collapsible <details>/<summary> toggle block.
// ===========================================================================

interface DetailsOptions {
  HTMLAttributes: Record<string, unknown>
}

const DetailsNode = Node.create<DetailsOptions>({
  name: 'details',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      summary: {
        default: 'Details',
        parseHTML: (element) =>
          element.querySelector('summary')?.textContent?.trim() ?? 'Details',
        renderHTML: () => ({}), // handled via DOM structure
      },
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) =>
          attributes['open'] ? { open: '' } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'details[data-details]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const summary = (node.attrs['summary'] as string) ?? 'Details'
    return [
      'details',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-details': 'true',
        class: 'rounded-md border border-border my-2 overflow-hidden',
      }),
      ['summary', { class: 'px-4 py-2 font-medium cursor-pointer select-none hover:bg-muted/50 transition-colors' }, summary],
      ['div', { class: 'px-4 py-3 border-t border-border' }, 0],
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const summaryText = (node.attrs['summary'] as string) ?? 'Details'
      const isOpen = Boolean(node.attrs['open'])

      // Outer <details>
      const dom = document.createElement('details')
      dom.setAttribute('data-details', 'true')
      dom.className = 'rounded-md border border-border my-2 overflow-hidden'
      if (isOpen) dom.setAttribute('open', '')

      // <summary>
      const summaryEl = document.createElement('summary')
      summaryEl.className =
        'px-4 py-2 font-medium cursor-pointer select-none hover:bg-muted/50 transition-colors list-none flex items-center gap-2'
      summaryEl.textContent = summaryText

      // Chevron icon (CSS-based rotation)
      const chevron = document.createElement('span')
      chevron.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
      chevron.style.transition = 'transform 0.2s ease'
      chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
      summaryEl.prepend(chevron)

      // Editable summary input (shown when clicking the text area)
      summaryEl.addEventListener('click', (e) => {
        // Toggle open state in ProseMirror attrs
        if (typeof getPos === 'function') {
          const currentOpen = dom.hasAttribute('open')
          // Tiptap will re-render, so we update the attr after browser toggles
          requestAnimationFrame(() => {
            const nowOpen = dom.hasAttribute('open')
            chevron.style.transform = nowOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(getPos(), undefined, {
                ...node.attrs,
                open: nowOpen,
              })
              return true
            }).run()
          })
        }
        // Prevent ProseMirror from intercepting the native toggle
        e.stopPropagation()
      })

      // Double-click on summary to edit the text
      summaryEl.addEventListener('dblclick', (e) => {
        e.preventDefault()
        const newSummary = window.prompt('Edit summary:', summaryText)
        if (newSummary !== null && newSummary !== summaryText && typeof getPos === 'function') {
          editor.chain().focus().command(({ tr }) => {
            tr.setNodeMarkup(getPos(), undefined, {
              ...node.attrs,
              summary: newSummary,
            })
            return true
          }).run()
        }
      })

      dom.appendChild(summaryEl)

      // Content wrapper
      const contentEl = document.createElement('div')
      contentEl.className = 'px-4 py-3 border-t border-border'
      dom.appendChild(contentEl)

      return {
        dom,
        contentDOM: contentEl,
        update(updatedNode) {
          if (updatedNode.type.name !== 'details') return false
          const newSummary = (updatedNode.attrs['summary'] as string) ?? 'Details'
          const newOpen = Boolean(updatedNode.attrs['open'])

          // Update summary text (strip chevron SVG, then set)
          const svgEl = summaryEl.querySelector('svg')
          summaryEl.textContent = newSummary
          if (svgEl) {
            const wrapper = document.createElement('span')
            wrapper.style.transition = 'transform 0.2s ease'
            wrapper.style.transform = newOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            wrapper.appendChild(svgEl)
            summaryEl.prepend(wrapper)
          }

          // Sync open attribute
          if (newOpen) {
            dom.setAttribute('open', '')
          } else {
            dom.removeAttribute('open')
          }
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setDetails:
        (attrs: { summary?: string } = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs)
        },
      toggleDetails:
        (attrs: { summary?: string } = {}) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs)
        },
    } as Record<string, (...args: unknown[]) => unknown>
  },
})

// ===========================================================================
// TrailingNode Extension
// Ensures there is always a trailing empty paragraph in the body node.
// ===========================================================================

const trailingNodeKey = new PluginKey('trailingNode')

const TrailingNode = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: trailingNodeKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc, tr, schema } = newState
          const paragraphType = schema.nodes['paragraph']
          if (!paragraphType) return null

          // Find the body node (second child of doc).
          const bodyNode = doc.lastChild
          if (!bodyNode || bodyNode.type.name !== 'body') return null

          const bodyLastChild = bodyNode.lastChild
          // If the last child of body is already an empty paragraph, do nothing.
          if (
            bodyLastChild &&
            bodyLastChild.type === paragraphType &&
            bodyLastChild.nodeSize === 2 // empty paragraph
          ) {
            return null
          }

          // Append an empty paragraph at the end of body.
          const endOfBody = doc.content.size - 1 // before the closing token of doc
          const paragraph = paragraphType.create()
          return tr.insert(endOfBody, paragraph)
        },
      }),
    ]
  },
})

// ===========================================================================
// UniqueID Extension
// Stamps a unique data-id on every block node when it is created.
// ===========================================================================

const uniqueIdKey = new PluginKey('uniqueId')

const UniqueID = Extension.create({
  name: 'uniqueId',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: uniqueIdKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc, tr } = newState
          let modified = false

          doc.descendants((node, pos) => {
            // Only stamp block nodes that lack a data-id attr.
            if (!node.isBlock) return
            if (node.type.name === 'doc' || node.type.name === 'title' || node.type.name === 'body') return

            const existingId = node.attrs['data-id'] as string | undefined
            if (!existingId) {
              // Check that the node type supports attrs (has data-id in its spec).
              const attrSpec = node.type.spec.attrs
              if (attrSpec && 'data-id' in attrSpec) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  'data-id': crypto.randomUUID(),
                })
                modified = true
              }
            }
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})

// Helper: extend a node type to accept data-id attribute.
// We patch the standard nodes via Tiptap's extend mechanism.
const ParagraphWithId = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const BlockquoteWithId = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const CodeBlockWithId = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const BulletListWithId = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const OrderedListWithId = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const TaskListWithId = TaskList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

const HorizontalRuleWithId = HorizontalRule.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-id': { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => a['data-id'] ? { 'data-id': a['data-id'] } : {} },
    }
  },
})

// ===========================================================================
// KeyboardShortcuts Extension
// Mod-Shift-c → toggle callout (info)
// Mod-Shift-t → toggle details
// Mod-Shift-h → toggle highlight
// ===========================================================================

const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': ({ editor }) => {
        return editor.commands.toggleCallout({ type: 'info' })
      },
      'Mod-Shift-t': ({ editor }) => {
        return editor.commands.toggleDetails({ summary: 'Details' })
      },
      'Mod-Shift-h': ({ editor }) => {
        return editor.chain().focus().toggleHighlight().run()
      },
    }
  },
})

// ===========================================================================
// Default content — structured empty document
// ===========================================================================

const DEFAULT_CONTENT = '<h1 data-title="true"></h1><div data-body="true"><p></p></div>'

// ===========================================================================
// BASE_EXTENSIONS — stable module-level array, no callbacks
// ===========================================================================

const BASE_EXTENSIONS: AnyExtension[] = [
  CustomDocument,
  TitleNode,
  BodyNode,
  Text,
  ParagraphWithId,
  Bold,
  Italic,
  Strike,
  Code,
  Underline,
  Highlight.configure({ multicolor: false }),
  HeadingWithId.configure({ levels: [2, 3] }),
  BlockquoteWithId,
  CodeBlockWithId,
  HorizontalRuleWithId,
  BulletListWithId,
  OrderedListWithId,
  ListItem,
  TaskListWithId,
  TaskItem.configure({ nested: true }),
  CalloutNode,
  DetailsNode,
  Dropcursor,
  Gapcursor,
  History,
  Typography,
  TrailingNode,
  UniqueID,
  KeyboardShortcuts,
]

// ===========================================================================
// BubbleMenuContent — formatting toolbar shown on text selection
// ===========================================================================

interface EditorState {
  isBold: boolean
  isItalic: boolean
  isStrike: boolean
  isCode: boolean
  isUnderline: boolean
  isHighlight: boolean
  isH2: boolean
  isBlockquote: boolean
}

interface BubbleMenuContentProps {
  editor: ReturnType<typeof useEditor>
}

function BubbleMenuContent({ editor }: BubbleMenuContentProps): React.JSX.Element | null {
  // We track editor state via a forced re-render triggered by editor events.
  const [state, setState] = React.useState<EditorState>({
    isBold: false,
    isItalic: false,
    isStrike: false,
    isCode: false,
    isUnderline: false,
    isHighlight: false,
    isH2: false,
    isBlockquote: false,
  })

  useEffect(() => {
    if (!editor) return
    const update = (): void => {
      setState({
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isStrike: editor.isActive('strike'),
        isCode: editor.isActive('code'),
        isUnderline: editor.isActive('underline'),
        isHighlight: editor.isActive('highlight'),
        isH2: editor.isActive('heading', { level: 2 }),
        isBlockquote: editor.isActive('blockquote'),
      })
    }
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) return null

  const btn = 'p-1.5 rounded transition-colors cursor-pointer select-none'
  const active = 'bg-foreground text-background'
  const idle = 'text-foreground/70 hover:bg-muted hover:text-foreground'
  const divider = 'w-px h-4 bg-border mx-0.5 self-center'

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label="Text formatting"
      className="flex items-center gap-px rounded-lg border border-border bg-popover shadow-md p-1"
    >
      <button
        aria-label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(btn, state.isBold ? active : idle)}
      >
        <BoldIcon size={14} strokeWidth={2.5} />
      </button>
      <button
        aria-label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(btn, state.isItalic ? active : idle)}
      >
        <ItalicIcon size={14} strokeWidth={2} />
      </button>
      <button
        aria-label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(btn, state.isUnderline ? active : idle)}
      >
        <UnderlineIcon size={14} strokeWidth={2} />
      </button>
      <button
        aria-label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(btn, state.isStrike ? active : idle)}
      >
        <Strikethrough size={14} strokeWidth={2} />
      </button>
      <button
        aria-label="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(btn, state.isCode ? active : idle)}
      >
        <CodeIcon size={14} strokeWidth={2} />
      </button>
      <button
        aria-label="Highlight"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={cn(btn, state.isHighlight ? active : idle)}
      >
        <Highlighter size={14} strokeWidth={2} />
      </button>

      <span className={divider} aria-hidden />

      <button
        aria-label="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(btn, state.isH2 ? active : idle)}
      >
        <Heading2 size={14} strokeWidth={2} />
      </button>
      <button
        aria-label="Blockquote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(btn, state.isBlockquote ? active : idle)}
      >
        <Quote size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

// ===========================================================================
// EditorAdapter — owns useEditor, sync effects, renders BubbleMenu + content
// ===========================================================================

interface EditorAdapterProps {
  value: string
  onChange: (value: string) => void
  placeholder: string | undefined
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  forwardedRef: React.Ref<HTMLDivElement>
}

function EditorAdapter({
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  forwardedRef,
}: EditorAdapterProps): React.JSX.Element {
  // Stable ref for onChange — prevents editor re-creation when callback identity changes.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Guard: skip re-syncing when the update originated from within the editor.
  const internalChangeRef = useRef(false)

  const allExtensions = useMemo<AnyExtension[]>(
    () => [
      ...BASE_EXTENSIONS,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'title') return 'Untitled'
          if (node.type.name === 'paragraph') return placeholder ?? "Type '/' for commands…"
          return ''
        },
        // Show placeholder only when node is empty and has no siblings of the same type
        showOnlyCurrent: false,
      }),
    ],
    [placeholder],
  )

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions: allExtensions,
      content: value || DEFAULT_CONTENT,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => {
        internalChangeRef.current = true
        onChangeRef.current(ed.getHTML())
      },
      editorProps: {
        attributes: {
          class:
            'focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words',
        },
      },
    }),
    // allExtensions is stable by reference (useMemo with [placeholder]).
    // We deliberately omit `value` here — we sync it via useEffect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allExtensions],
  )

  const editor = useEditor(editorOptions, [])

  // Sync external value into editor when it changes from outside.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }

    const currentHTML = editor.getHTML()
    const targetContent = value || DEFAULT_CONTENT
    if (currentHTML !== targetContent) {
      editor.commands.setContent(targetContent, { emitUpdate: false })
    }
  }, [value, editor])

  // Sync disabled / editable state.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  // Auto-focus once on mount.
  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed) return
    didAutoFocus.current = true
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) {
        // Focus inside the title node (position 1).
        editor.commands.setTextSelection(1)
        editor.commands.focus()
      }
    })
  }, [editor, autoFocus])

  return (
    <div className="relative w-full" ref={forwardedRef}>
      {editor && (
        <BubbleMenu editor={editor}>
          <BubbleMenuContent editor={editor} />
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}

// ===========================================================================
// SecondTextEditor — root component (exported)
// ===========================================================================

const SecondTextEditor = React.memo(
  React.forwardRef<HTMLDivElement, SecondTextEditorProps>((props, ref) => {
    const {
      value,
      onChange,
      placeholder,
      autoFocus,
      className,
      disabled,
      id,
    } = props

    // Stable onChange reference to avoid identity churn in EditorAdapter.
    const stableOnChange = useCallback(
      (html: string) => {
        onChange(html)
      },
      [onChange],
    )

    return (
      <div
        id={id}
        className={cn(
          'w-full rounded-md',
          disabled && 'opacity-60 pointer-events-none',
          className,
        )}
      >
        <EditorAdapter
          value={value}
          onChange={stableOnChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          forwardedRef={ref}
        />
      </div>
    )
  }),
)
SecondTextEditor.displayName = 'SecondTextEditor'

export { SecondTextEditor }
