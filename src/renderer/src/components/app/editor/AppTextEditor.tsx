/**
 * AppTextEditor — Feature-rich TipTap v3 editor for OpenWriter.
 *
 * Features:
 *  - Slash command palette (/, groups: Basic Blocks, Lists, Other)
 *  - Bubble menu with formatting toggles (Bold, Italic, Strike, Code,
 *    Underline, Highlight, H2, Blockquote)
 *  - Block controls: + (add below) and drag handle in left gutter
 *  - Word / character count bar
 *  - Streaming content support
 *  - Disabled / autoFocus props
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
import { type Editor, type AnyExtension } from '@tiptap/core'

// Built-in extensions already in package.json
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'

// Newly installed block/node extensions
import Paragraph from '@tiptap/extension-paragraph'
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

// Mark extensions
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'

// Lucide icons
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Code as CodeIcon,
  Underline as UnderlineIcon,
  Highlighter,
  Heading2,
  Quote,
  GripVertical,
  Plus,
  Text as TextIcon,
  Heading1,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Minus,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { SlashCommand, executeSlashCommand } from './extensions/SlashCommand'
import type { SlashCommandState } from './extensions/SlashCommand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
  /**
   * Additional extensions merged after the built-in defaults.
   * Provide a stable reference to avoid unnecessary editor re-creation.
   */
  extensions?: AnyExtension[]
  /**
   * Live streaming content that overrides `value` without triggering onChange.
   */
  streamingContent?: string
  onAddBelow?: (pos: number) => void
  onDelete?: (pos: number) => void
  onEnhance?: (pos: number) => void
}

// ---------------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------------

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
  // ── Basic Blocks ─────────────────────────────────────────────────────────
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
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={15} />,
    group: 'Basic Blocks',
    keywords: ['h1', 'heading', 'title', 'large'],
    execute: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
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
]

const SLASH_GROUPS = ['Basic Blocks', 'Lists', 'Other'] as const

// ---------------------------------------------------------------------------
// Internal: SlashCommandMenu
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal: BubbleMenuContent
// ---------------------------------------------------------------------------

function BubbleMenuContent({ editor }: { editor: Editor }): React.JSX.Element {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isStrike: ctx.editor.isActive('strike'),
      isCode: ctx.editor.isActive('code'),
      isUnderline: ctx.editor.isActive('underline'),
      isHighlight: ctx.editor.isActive('highlight'),
      isH2: ctx.editor.isActive('heading', { level: 2 }),
      isBlockquote: ctx.editor.isActive('blockquote'),
    }),
  })

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

// ---------------------------------------------------------------------------
// Internal: BlockControls
// Renders + and drag handle in the left gutter when a block is hovered.
// ---------------------------------------------------------------------------

interface BlockControlsProps {
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
  onAddBelow?: (pos: number) => void
}

interface HoveredBlock {
  dom: HTMLElement
  pos: number
  top: number
}

/**
 * Resolves the nearest top-level block (direct child of the doc/body) from a
 * DOM element by walking up the editor's nodeViews and DOM tree.
 */
function resolveTopLevelBlock(
  editor: Editor,
  target: HTMLElement,
): HoveredBlock | null {
  const editorDom = editor.view.dom
  if (!editorDom.contains(target)) return null

  // Walk up from target to find a direct child of the editor element.
  let el: HTMLElement | null = target
  while (el && el.parentElement !== editorDom) {
    el = el.parentElement
  }
  if (!el) return null

  // Map the DOM node back to a ProseMirror position.
  try {
    const pos = editor.view.posAtDOM(el, 0)
    const rect = el.getBoundingClientRect()
    const containerRect = editorDom.getBoundingClientRect()
    return {
      dom: el,
      pos,
      top: rect.top - containerRect.top,
    }
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

  // ── Mouse move: detect which block is hovered ──────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onMouseMove = (e: MouseEvent): void => {
      if (isDragging) return
      const block = resolveTopLevelBlock(editor, e.target as HTMLElement)
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

      // If the consumer wants to handle it (multi-block ContentBlock pattern).
      if (onAddBelow) {
        onAddBelow(hovered.pos)
        return
      }

      // Default: insert an empty paragraph after the hovered block.
      const { state, dispatch } = editor.view
      const $pos = state.doc.resolve(hovered.pos)
      // Find the end position of the node at this position.
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

      // Use a transparent drag image so we don't get the ghost element.
      const ghost = document.createElement('div')
      ghost.style.position = 'fixed'
      ghost.style.top = '-9999px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 0, 0)
      requestAnimationFrame(() => document.body.removeChild(ghost))
    },
    [hovered],
  )

  const handleDragOver = useCallback((e: DragEvent): void => {
    e.preventDefault()
    const editorDom = editor.view.dom as HTMLElement
    const indicator = dropIndicatorRef.current
    if (!indicator) return

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    if (!target || !editorDom.contains(target)) return

    let el: HTMLElement | null = target
    while (el && el.parentElement !== editorDom) {
      el = el.parentElement
    }
    if (!el) return

    const rect = el.getBoundingClientRect()
    const containerRect = editorDom.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertBefore = e.clientY < midY
    const indicatorTop = insertBefore
      ? rect.top - containerRect.top - 1
      : rect.bottom - containerRect.top - 1

    indicator.style.top = `${indicatorTop}px`
    indicator.style.display = 'block'
  }, [editor])

  const handleDrop = useCallback((e: DragEvent): void => {
    e.preventDefault()
    const indicator = dropIndicatorRef.current
    if (indicator) indicator.style.display = 'none'

    const editorDom = editor.view.dom as HTMLElement
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    if (!target || !editorDom.contains(target)) {
      setIsDragging(false)
      return
    }

    let el: HTMLElement | null = target
    while (el && el.parentElement !== editorDom) {
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

      // Remove source node and insert at target.
      let tr = state.tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
      // Recalculate target pos after deletion.
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
  }, [editor])

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
      {/* Drop indicator */}
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

      {/* Controls */}
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

// ---------------------------------------------------------------------------
// Internal: WordCount
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// BASE_EXTENSIONS — stable, module-level, no callbacks.
// Opened schema: standard Document + full block/mark set.
// SlashCommand is excluded here and configured per-instance (needs onChange cb).
// ---------------------------------------------------------------------------

const BASE_EXTENSIONS: AnyExtension[] = [
  Document,
  Paragraph,
  Text,
  Heading.configure({ levels: [1, 2, 3] }),
  Bold,
  Italic,
  Strike,
  Code,
  Underline,
  Highlight.configure({ multicolor: false }),
  Blockquote,
  CodeBlock,
  HorizontalRule,
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem.configure({ nested: true }),
  Dropcursor,
  Gapcursor,
  History,
]

// ---------------------------------------------------------------------------
// Internal: EditorAdapter
// Owns useEditor, all sync effects, and renders BubbleMenu + content.
// ---------------------------------------------------------------------------

interface EditorAdapterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  extensions: AnyExtension[]
  forwardedRef: React.Ref<HTMLDivElement>
  streamingContent: string | undefined
  onAddBelow: ((pos: number) => void) | undefined
  onDelete: ((pos: number) => void) | undefined
  onEnhance: ((pos: number) => void) | undefined
}

function EditorAdapter({
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  extensions,
  forwardedRef,
  streamingContent,
  onAddBelow,
}: EditorAdapterProps): React.JSX.Element {
  // Stable refs for all callbacks — prevents editor re-creation when they change.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onAddBelowRef = useRef(onAddBelow)
  onAddBelowRef.current = onAddBelow

  // Guard to skip echoing internal updates back into the editor.
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

  // Merge all extensions: base + SlashCommand (with callback) + consumer extras.
  const allExtensions = useMemo<AnyExtension[]>(
    () => [
      ...BASE_EXTENSIONS,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'paragraph') {
            return placeholder ?? "Type '/' for commands…"
          }
          return ''
        },
      }),
      SlashCommand.configure({ onChange: handleSlashChange }),
      ...extensions,
    ],
    // handleSlashChange is stable (useCallback []), extensions is stable by contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extensions, placeholder],
  )

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions: allExtensions,
      content: value || '',
      immediatelyRender: false,
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
        internalChangeRef.current = true
        onChangeRef.current(ed.getHTML())
      },
      editorProps: {
        attributes: {
          class: 'focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words',
        },
      },
    }),
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

    const current = editor.getHTML()
    if (current !== (value || '')) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, streamingContent, editor])

  // Sync disabled state.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  // Auto-focus (once).
  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed) return
    didAutoFocus.current = true
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus('start')
    })
  }, [editor, autoFocus])

  // Container ref for BlockControls hover tracking.
  const containerRef = useRef<HTMLDivElement>(null)

  // Bubble menu should be hidden while slash menu is open.
  const shouldShowBubble = !slashState.active

  return (
    <div className="relative w-full" ref={forwardedRef}>
      {/* Bubble menu (text selection toolbar) */}
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
        {/* Block controls (absolute inside this container) */}
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

// ---------------------------------------------------------------------------
// AppTextEditor — root component (exported)
// ---------------------------------------------------------------------------

const AppTextEditor = React.memo(
  React.forwardRef<HTMLDivElement, AppTextEditorProps>((props, ref) => {
    const extraExtensions = useMemo(
      () => props.extensions ?? [],
      [props.extensions],
    )

    return (
      <div className={cn('w-full', props.className)} id={props.id}>
        <EditorAdapter
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          autoFocus={props.autoFocus}
          disabled={props.disabled}
          extensions={extraExtensions}
          forwardedRef={ref}
          streamingContent={props.streamingContent}
          onAddBelow={props.onAddBelow}
          onDelete={props.onDelete}
          onEnhance={props.onEnhance}
        />
      </div>
    )
  }),
)
AppTextEditor.displayName = 'AppTextEditor'

export { AppTextEditor }
