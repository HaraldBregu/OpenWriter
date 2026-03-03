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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useEditor,
  EditorContent,
  useEditorState,
  type UseEditorOptions,
} from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Node,
  Extension,
  type AnyExtension,
  type Editor,
  mergeAttributes,
} from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// ===========================================================================
// Module augmentation — register custom commands with Tiptap's type system
// ===========================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType
    }
    details: {
      setDetails: (attrs?: { summary?: string }) => ReturnType
      toggleDetails: (attrs?: { summary?: string }) => ReturnType
    }
  }
}

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
  Text as TextIcon,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  GripVertical,
  Plus,
  Info,
  ChevronRight,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { SlashCommand, executeSlashCommand } from './extensions/SlashCommand'
import type { SlashCommandState } from './extensions/SlashCommand'

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
  /**
   * Live streaming content that overrides `value` without triggering onChange.
   */
  streamingContent?: string
  onAddBelow?: (pos: number) => void
  onDelete?: (pos: number) => void
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
    return ({ node, getPos, editor }) => {
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
          const pos = getPos()
          if (pos === undefined) return
          editor.chain().focus().command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { type: newType })
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
          // Tiptap will re-render, so we update the attr after the browser toggles
          requestAnimationFrame(() => {
            const pos = getPos()
            if (pos === undefined) return
            const nowOpen = dom.hasAttribute('open')
            chevron.style.transform = nowOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
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
          const pos = getPos()
          if (pos === undefined) return
          editor.chain().focus().command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
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
// Slash command definitions
// ===========================================================================

interface SlashCommandDef {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  group: string
  keywords: string[]
  execute: (editor: Editor) => void
}

const SLASH_COMMANDS: SlashCommandDef[] = [
  // ── Basic Blocks ──────────────────────────────────────────────────────────
  {
    id: 'text',
    label: 'Text',
    description: 'Plain paragraph',
    icon: <TextIcon size={15} />,
    group: 'Basic Blocks',
    keywords: ['text', 'paragraph', 'plain'],
    execute: (ed) => ed.chain().focus().setParagraph().run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={15} />,
    group: 'Basic Blocks',
    keywords: ['h2', 'heading', 'subtitle', 'medium'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={15} />,
    group: 'Basic Blocks',
    keywords: ['h3', 'heading', 'small'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  // ── Lists ─────────────────────────────────────────────────────────────────
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Simple unordered list',
    icon: <List size={15} />,
    group: 'Lists',
    keywords: ['bullet', 'unordered', 'list', 'ul'],
    execute: (ed) => ed.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    description: 'Ordered numbered list',
    icon: <ListOrdered size={15} />,
    group: 'Lists',
    keywords: ['numbered', 'ordered', 'list', 'ol', '1'],
    execute: (ed) => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'todo',
    label: 'To-do List',
    description: 'Trackable checklist',
    icon: <ListTodo size={15} />,
    group: 'Lists',
    keywords: ['todo', 'task', 'check', 'checkbox'],
    execute: (ed) => ed.chain().focus().toggleTaskList().run(),
  },
  // ── Other ─────────────────────────────────────────────────────────────────
  {
    id: 'quote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: <Quote size={15} />,
    group: 'Other',
    keywords: ['quote', 'blockquote', 'cite'],
    execute: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeblock',
    label: 'Code Block',
    description: 'Monospace code block',
    icon: <CodeIcon size={15} />,
    group: 'Other',
    keywords: ['code', 'codeblock', 'pre', 'mono'],
    execute: (ed) => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal rule',
    icon: <Minus size={15} />,
    group: 'Other',
    keywords: ['divider', 'rule', 'hr', 'separator', 'line'],
    execute: (ed) => ed.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Info callout block',
    icon: <Info size={15} />,
    group: 'Other',
    keywords: ['callout', 'info', 'admonition', 'note'],
    execute: (ed) => ed.commands.setCallout({ type: 'info' }),
  },
  {
    id: 'details',
    label: 'Toggle',
    description: 'Collapsible toggle block',
    icon: <ChevronRight size={15} />,
    group: 'Other',
    keywords: ['toggle', 'details', 'collapsible', 'fold'],
    execute: (ed) => ed.commands.setDetails({ summary: 'Details' }),
  },
]

const SLASH_GROUPS = ['Basic Blocks', 'Lists', 'Other'] as const

// ===========================================================================
// SlashCommandMenu — floating palette triggered by '/'
// ===========================================================================

interface SlashCommandMenuProps {
  slashState: SlashCommandState
  editor: Editor
  onClose: () => void
}

function SlashCommandMenu({
  slashState,
  editor,
  onClose,
}: SlashCommandMenuProps): React.JSX.Element | null {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const filtered = useMemo<SlashCommandDef[]>(() => {
    const q = slashState.query.toLowerCase()
    if (!q) return SLASH_COMMANDS
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q)),
    )
  }, [slashState.query])

  // Reset selection when filtered list changes.
  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered])

  // Scroll selected item into view.
  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Position the menu based on cursor coordinates.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { top, left } = slashState.coords
    const vw = window.innerWidth
    const rect = el.getBoundingClientRect()
    const clampedLeft = Math.min(left, vw - rect.width - 8)
    el.style.top = `${top}px`
    el.style.left = `${Math.max(0, clampedLeft)}px`
  }, [slashState.coords])

  // Keyboard handler — must be on the document to intercept keys going to TipTap.
  useEffect(() => {
    if (!slashState.active) return

    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[selectedIndex]
        if (cmd) runCommand(cmd)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [slashState.active, filtered, selectedIndex, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  const runCommand = useCallback(
    (cmd: SlashCommandDef) => {
      executeSlashCommand(editor, slashState.triggerPos, slashState.query, cmd.execute)
      onClose()
    },
    [editor, slashState.triggerPos, slashState.query, onClose],
  )

  if (!slashState.active || filtered.length === 0) return null

  // Build grouped list.
  const groups = SLASH_GROUPS.map((group) => ({
    label: group,
    items: filtered.filter((cmd) => cmd.group === group),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Slash command menu"
      className={cn(
        'fixed z-50 min-w-[220px] max-w-xs max-h-80 overflow-y-auto',
        'rounded-xl border border-border bg-popover shadow-lg py-1',
      )}
    >
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
            {group.label}
          </div>
          {group.items.map((cmd) => {
            const globalIdx = filtered.indexOf(cmd)
            const isSelected = globalIdx === selectedIndex
            return (
              <button
                key={cmd.id}
                ref={(el) => {
                  itemRefs.current[globalIdx] = el
                }}
                role="menuitem"
                aria-selected={isSelected}
                onMouseEnter={() => setSelectedIndex(globalIdx)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  runCommand(cmd)
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50',
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                  {cmd.icon}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium leading-tight">{cmd.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {cmd.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ===========================================================================
// BlockControls — + button and drag handle in the left gutter
// Only resolves blocks inside the body node, never the title.
// ===========================================================================

interface HoveredBlock {
  dom: HTMLElement
  pos: number
  top: number
}

interface BlockControlsProps {
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
  onAddBelow?: (pos: number) => void
}

/**
 * Resolves the nearest direct child of the body wrapper (`div[data-body]`)
 * from a DOM event target. Returns null when the target is inside the title
 * node or outside the editor entirely.
 */
function resolveBodyBlock(
  editor: Editor,
  target: HTMLElement,
): HoveredBlock | null {
  const editorDom = editor.view.dom
  if (!editorDom.contains(target)) return null

  // Find the body wrapper element (div[data-body]).
  const bodyEl = editorDom.querySelector('[data-body]') as HTMLElement | null
  if (!bodyEl || !bodyEl.contains(target)) return null

  // Walk up from target to find a direct child of the body element.
  let el: HTMLElement | null = target
  while (el && el.parentElement !== bodyEl) {
    el = el.parentElement
  }
  if (!el) return null

  try {
    const pos = editor.view.posAtDOM(el, 0)
    const rect = el.getBoundingClientRect()
    const containerRect = bodyEl.getBoundingClientRect()
    return { dom: el, pos, top: rect.top - containerRect.top }
  } catch {
    return null
  }
}

function BlockControls({
  editor,
  containerRef,
  onAddBelow,
}: BlockControlsProps): React.JSX.Element | null {
  const [hovered, setHovered] = useState<HoveredBlock | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragSourcePosRef = useRef<number>(-1)
  const dropIndicatorRef = useRef<HTMLDivElement | null>(null)

  // ── Mouse move: detect which body block is hovered ─────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onMouseMove = (e: MouseEvent): void => {
      if (isDragging) return
      const block = resolveBodyBlock(editor, e.target as HTMLElement)
      setHovered(block)
    }

    const onMouseLeave = (): void => {
      if (!isDragging) setHovered(null)
    }

    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)
    return () => {
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [editor, containerRef, isDragging])

  // ── Add below ──────────────────────────────────────────────────────────
  const handleAddBelow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!hovered) return

      // If the consumer wants to handle it externally.
      if (onAddBelow) {
        onAddBelow(hovered.pos)
        return
      }

      // Default: insert an empty paragraph after the hovered block.
      const { state, dispatch } = editor.view
      const $pos = state.doc.resolve(hovered.pos)
      const node = $pos.nodeAfter ?? $pos.node()
      const insertPos = hovered.pos + (node?.nodeSize ?? 1)
      const paragraph = state.schema.nodes.paragraph?.create()
      if (!paragraph) return
      const tr = state.tr.insert(insertPos, paragraph)
      dispatch(tr)
      editor.commands.focus()
      editor.commands.setTextSelection(insertPos + 1)
    },
    [hovered, editor, onAddBelow],
  )

  // ── Drag and drop reordering ───────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!hovered) return
      dragSourcePosRef.current = hovered.pos
      setIsDragging(true)

      // Use a transparent drag image.
      const ghost = document.createElement('div')
      ghost.style.position = 'fixed'
      ghost.style.top = '-9999px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 0, 0)
      requestAnimationFrame(() => document.body.removeChild(ghost))
    },
    [hovered],
  )

  const handleDragOver = useCallback(
    (e: DragEvent): void => {
      e.preventDefault()
      const editorDom = editor.view.dom as HTMLElement
      const bodyEl = editorDom.querySelector('[data-body]') as HTMLElement | null
      const indicator = dropIndicatorRef.current
      if (!indicator || !bodyEl) return

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      if (!target || !bodyEl.contains(target)) return

      // Walk to a direct child of body.
      let el: HTMLElement | null = target
      while (el && el.parentElement !== bodyEl) {
        el = el.parentElement
      }
      if (!el) return

      const rect = el.getBoundingClientRect()
      const containerRect = bodyEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const insertBefore = e.clientY < midY
      const indicatorTop = insertBefore
        ? rect.top - containerRect.top - 1
        : rect.bottom - containerRect.top - 1

      indicator.style.top = `${indicatorTop}px`
      indicator.style.display = 'block'
    },
    [editor],
  )

  const handleDrop = useCallback(
    (e: DragEvent): void => {
      e.preventDefault()
      const indicator = dropIndicatorRef.current
      if (indicator) indicator.style.display = 'none'

      const editorDom = editor.view.dom as HTMLElement
      const bodyEl = editorDom.querySelector('[data-body]') as HTMLElement | null
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      if (!target || !bodyEl || !bodyEl.contains(target)) {
        setIsDragging(false)
        return
      }

      // Walk to a direct child of body.
      let el: HTMLElement | null = target
      while (el && el.parentElement !== bodyEl) {
        el = el.parentElement
      }
      if (!el) {
        setIsDragging(false)
        return
      }

      try {
        const dropPos = editor.view.posAtDOM(el, 0)
        const sourcePos = dragSourcePosRef.current

        if (dropPos === sourcePos) {
          setIsDragging(false)
          return
        }

        const { state, dispatch } = editor.view
        const $source = state.doc.resolve(sourcePos)
        const sourceNode = $source.nodeAfter
        if (!sourceNode) {
          setIsDragging(false)
          return
        }

        const rect = el.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        const insertBefore = e.clientY < midY

        // Remove source node and insert at target position.
        let tr = state.tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
        let targetPos = tr.mapping.map(dropPos)
        const $target = tr.doc.resolve(targetPos)
        const targetNode = $target.nodeAfter
        if (targetNode) {
          const insertAt = insertBefore ? targetPos : targetPos + targetNode.nodeSize
          tr = tr.insert(insertAt, sourceNode)
        }
        dispatch(tr)
      } catch {
        // Ignore positioning errors
      } finally {
        setIsDragging(false)
      }
    },
    [editor],
  )

  // Attach drag-over and drop to the container.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('drop', handleDrop)
    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('drop', handleDrop)
    }
  }, [containerRef, handleDragOver, handleDrop])

  if (!hovered && !isDragging) return null

  const controlStyle: React.CSSProperties = {
    position: 'absolute',
    top: hovered ? hovered.top : 0,
    left: 0,
    width: 56,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingTop: 2,
    gap: 2,
    zIndex: 10,
  }

  return (
    <>
      {/* Drop indicator line */}
      <div
        ref={dropIndicatorRef}
        aria-hidden
        style={{
          display: 'none',
          position: 'absolute',
          left: 56,
          right: 0,
          height: 2,
          borderRadius: 9999,
          backgroundColor: 'var(--color-primary, #6366f1)',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />

      {/* + and drag-handle buttons */}
      <div style={controlStyle}>
        <button
          aria-label="Add block below"
          onMouseDown={handleAddBelow}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Plus size={14} />
        </button>
        <div
          aria-label="Drag to reorder"
          draggable
          onDragStart={handleDragStart}
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </div>
      </div>
    </>
  )
}

// ===========================================================================
// WordCount — reactive word/character count bar below the editor
// ===========================================================================

function WordCount({ editor }: { editor: Editor }): React.JSX.Element {
  const { words, chars } = useEditorState({
    editor,
    selector: (ctx) => {
      const text = ctx.editor.state.doc.textContent
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      return { words, chars: text.length }
    },
  })

  return (
    <div className="flex items-center justify-end px-4 py-1.5 border-t border-border">
      <span className="text-xs text-muted-foreground select-none">
        {words} {words === 1 ? 'word' : 'words'} · {chars}{' '}
        {chars === 1 ? 'character' : 'characters'}
      </span>
    </div>
  )
}

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
  streamingContent: string | undefined
  onAddBelow: ((pos: number) => void) | undefined
}

function EditorAdapter({
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  forwardedRef,
  streamingContent,
  onAddBelow,
}: EditorAdapterProps): React.JSX.Element {
  // Stable refs for callbacks — prevents editor re-creation when identity changes.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onAddBelowRef = useRef(onAddBelow)
  onAddBelowRef.current = onAddBelow

  // Guard: skip re-syncing when the update originated from within the editor.
  const internalChangeRef = useRef(false)

  // Slash command state (kept in React for the SlashCommandMenu render).
  const [slashState, setSlashState] = useState<SlashCommandState>({
    active: false,
    query: '',
    triggerPos: -1,
    coords: { top: 0, left: 0 },
  })

  const handleSlashChange = useCallback((state: SlashCommandState) => {
    setSlashState(state)
  }, [])

  const handleSlashClose = useCallback(() => {
    setSlashState({ active: false, query: '', triggerPos: -1, coords: { top: 0, left: 0 } })
  }, [])

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
      SlashCommand.configure({ onChange: handleSlashChange }),
    ],
    // handleSlashChange is stable (useCallback []). placeholder drives re-creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Sync external value / streaming content into editor.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (streamingContent !== undefined) {
      const current = editor.getHTML()
      if (current !== streamingContent) {
        editor.commands.setContent(streamingContent, { emitUpdate: false })
      }
      return
    }

    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }

    const currentHTML = editor.getHTML()
    const targetContent = value || DEFAULT_CONTENT
    if (currentHTML !== targetContent) {
      editor.commands.setContent(targetContent, { emitUpdate: false })
    }
  }, [value, streamingContent, editor])

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

  // Container ref for BlockControls hover tracking.
  const containerRef = useRef<HTMLDivElement>(null)

  // Bubble menu should be hidden while slash menu is open.
  const shouldShowBubble = !slashState.active

  return (
    <div className="relative w-full" ref={forwardedRef}>
      {/* Bubble menu (text selection toolbar) — hidden when slash menu is active */}
      {editor && shouldShowBubble && (
        <BubbleMenu editor={editor}>
          <BubbleMenuContent editor={editor} />
        </BubbleMenu>
      )}

      {/* Editor content area with block controls gutter */}
      <div
        ref={containerRef}
        className="relative"
        style={{ paddingLeft: 56 }} // reserve space for block controls gutter
      >
        {/* Block controls (absolute inside this container, body-only) */}
        {editor && (
          <BlockControls
            editor={editor}
            containerRef={containerRef}
            onAddBelow={onAddBelowRef.current}
          />
        )}

        <EditorContent editor={editor} />
      </div>

      {/* Word count bar */}
      {editor && <WordCount editor={editor} />}

      {/* Slash command menu (portaled to fixed position) */}
      {editor && slashState.active && (
        <SlashCommandMenu
          slashState={slashState}
          editor={editor}
          onClose={handleSlashClose}
        />
      )}
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
          streamingContent={props.streamingContent}
          onAddBelow={props.onAddBelow}
        />
      </div>
    )
  }),
)
SecondTextEditor.displayName = 'SecondTextEditor'

export { SecondTextEditor }
