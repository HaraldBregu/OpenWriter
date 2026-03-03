import React, { useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent, useEditorState, type UseEditorOptions } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type Editor, type AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { CustomHeading } from './extensions/CustomHeading'
import { Markdown } from '@tiptap/markdown'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import ListKeymap from '@tiptap/extension-list-keymap'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TabGhostText } from './extensions/TabGhostText'
import { CustomParagraph } from './extensions/CustomParagraph'
import { AppTextEditorOptionMenu } from './AppTextEditorOptionMenu'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

/**
 * Extensions that are independent of runtime callbacks and safe to define at
 * module level. `CustomParagraph` is intentionally excluded here — it must be
 * configured per-editor-instance so that `onAddBelow` can be wired up with a
 * stable, instance-specific callback. See `buildExtensions()` below.
 */
const BASE_EXTENSIONS: AnyExtension[] = [
  // Disable StarterKit's built-in paragraph — CustomParagraph replaces it with
  // a React NodeView that renders inline gutter buttons on hover.
  StarterKit.configure({
    paragraph: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    heading: false,
  }),
  // Custom heading with the same floating gutter button pattern as CustomParagraph.
  CustomHeading.configure({ levels: HEADING_LEVELS as unknown as import('@tiptap/extension-heading').Level[] }),
  Markdown,
  BulletList,
  OrderedList,
  ListItem,
  ListKeymap,
  TabGhostText,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level as HeadingLevel
        return `Heading ${level}`
      }
      return 'Write something, or type "/" for commands…'
    },
  }),
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface AppTextEditorProps {
  /** Current markdown value. */
  value: string
  /**
   * Called with the new markdown value on every change.
   * Stabilize with `useCallback` at the call site to prevent unnecessary re-renders.
   */
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
  /**
   * Additional TipTap extensions merged after the built-in defaults.
   * Provide a stable reference (e.g. module-level constant or `useMemo`) to
   * avoid unnecessary editor re-creation.
   */
  extensions?: AnyExtension[]
  /**
   * Live streaming content that overrides `value` in the TipTap editor without
   * triggering `onChange` or Redux updates.
   */
  streamingContent?: string
  /**
   * Called when the user clicks the "+" (add paragraph below) gutter button
   * on any paragraph node view.  Receives the ProseMirror document position of
   * the paragraph's start so the host can decide where to insert new content.
   *
   * When omitted the NodeView falls back to a built-in ProseMirror transaction
   * that inserts an empty paragraph immediately after the current one.
   */
  onAddBelow?: (pos: number) => void
  /** Called when the user selects "Delete" from the paragraph menu. */
  onDelete?: (pos: number) => void
  /** Called when the user selects "Enhance" from the paragraph menu. */
  onEnhance?: (pos: number) => void
}

// ---------------------------------------------------------------------------
// Internal: BubbleMenuContent
// ---------------------------------------------------------------------------

function BubbleMenuContent({ editor }: { editor: Editor }): React.JSX.Element {
  const { isBold, isItalic, isStrike, isCode, isBulletList, isOrderedList } = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isStrike: ctx.editor.isActive('strike'),
      isCode: ctx.editor.isActive('code'),
      isBulletList: ctx.editor.isActive('bulletList'),
      isOrderedList: ctx.editor.isActive('orderedList'),
    }),
  })

  const activeHeadingLevel = ([1, 2, 3] as HeadingLevel[]).find((l) =>
    editor.isActive('heading', { level: l }),
  )

  const btn = 'p-1.5 rounded transition-colors cursor-pointer select-none'
  const btnActive = 'bg-foreground text-background'
  const btnIdle = 'text-foreground/70 hover:bg-muted hover:text-foreground'

  const headingIcons = { 1: Heading1, 2: Heading2, 3: Heading3 } as const

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-px rounded-lg border border-border bg-popover shadow-md p-1"
    >
      {([1, 2, 3] as const).map((level) => {
        const Icon = headingIcons[level]
        return (
          <button
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            className={cn(btn, activeHeadingLevel === level ? btnActive : btnIdle)}
          >
            <Icon size={15} strokeWidth={2} />
          </button>
        )
      })}

      <div className="w-px h-4 bg-border mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(btn, isBold ? btnActive : btnIdle)}
      >
        <Bold size={15} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(btn, isItalic ? btnActive : btnIdle)}
      >
        <Italic size={15} strokeWidth={2} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(btn, isStrike ? btnActive : btnIdle)}
      >
        <Strikethrough size={15} strokeWidth={2} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(btn, isCode ? btnActive : btnIdle)}
      >
        <Code size={15} strokeWidth={2} />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(btn, isBulletList ? btnActive : btnIdle)}
      >
        <List size={15} strokeWidth={2} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(btn, isOrderedList ? btnActive : btnIdle)}
      >
        <ListOrdered size={15} strokeWidth={2} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal: TipTapAdapter
// ---------------------------------------------------------------------------

interface TipTapAdapterProps {
  value: string
  onChange: (value: string) => void
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  extensions: AnyExtension[]
  forwardedRef: React.Ref<HTMLDivElement>
  streamingContent: string | undefined
  onAddBelow: ((pos: number) => void) | undefined
  onDelete: ((pos: number) => void) | undefined
  onEnhance: ((pos: number) => void) | undefined
}

function TipTapAdapter({
  value,
  onChange,
  autoFocus,
  disabled,
  extensions,
  forwardedRef,
  streamingContent,
  onAddBelow,
  onDelete,
  onEnhance,
}: TipTapAdapterProps): React.JSX.Element {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Stable refs — updated every render so extension callbacks always read the
  // latest values without triggering editor re-creation.
  const onAddBelowRef = useRef(onAddBelow)
  onAddBelowRef.current = onAddBelow
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const onEnhanceRef = useRef(onEnhance)
  onEnhanceRef.current = onEnhance

  // Track whether the last change originated from the editor itself so the
  // external-sync effect can skip redundant (and disruptive) setContent calls.
  const internalChangeRef = useRef(false)

  // Build the full extension list once. `CustomParagraph` is configured here
  // (not at module level) so callbacks can be stable ref wrappers — preventing
  // editor re-creation on every parent re-render.
  const allExtensions = useMemo<AnyExtension[]>(
    () => [
      ...BASE_EXTENSIONS,
      CustomParagraph.configure({
        onAddBelow: (pos: number) => onAddBelowRef.current?.(pos),
        onDelete: (pos: number) => onDeleteRef.current?.(pos),
        onEnhance: (pos: number) => onEnhanceRef.current?.(pos),
      }),
      ...extensions,
    ],
    // `extensions` is the only runtime dependency — BASE_EXTENSIONS is module-level
    // and all callbacks read their refs so they never change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extensions],
  )

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions: allExtensions,
      content: value || '',
      contentType: 'markdown',
      immediatelyRender: false,
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
        internalChangeRef.current = true
        onChangeRef.current(ed.getMarkdown())
      },
      editorProps: {
        attributes: {
          class: 'focus:outline-none py-2 text-lg leading-relaxed text-foreground break-words',
        },
      },
    }),
    // allExtensions is the only dep that should gate editor re-creation.
    // onChangeRef is a stable ref wrapper so it is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allExtensions],
  )

  const editor = useEditor(editorOptions, [])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    // When streaming, always push the streaming content into the editor.
    if (streamingContent !== undefined) {
      const current = editor.getMarkdown()
      if (current !== streamingContent) {
        editor.commands.setContent(streamingContent, { emitUpdate: false, contentType: 'markdown' })
      }
      return
    }

    // If the value change came from the editor itself (user typing), skip
    // the setContent call — the editor already has the correct state and
    // re-setting would disrupt cursor position and break Enter/Backspace.
    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }

    // External value change (e.g. reset, load) — sync into the editor.
    const current = editor.getMarkdown()
    if (current !== (value || '')) {
      editor.commands.setContent(value || '', { emitUpdate: false, contentType: 'markdown' })
    }
  }, [value, streamingContent, editor])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed) return
    didAutoFocus.current = true
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus('start')
    })
  }, [editor, autoFocus])

  return (
    <div className="relative" ref={forwardedRef}>
      <BubbleMenu editor={editor}>
        {editor && <BubbleMenuContent editor={editor} />}
      </BubbleMenu>
      {editor && <AppTextEditorOptionMenu editor={editor} />}
      {/*
        px-8 creates the horizontal gutter space the ParagraphNodeView uses for
        its floating left/right action buttons. The NodeView uses `-mx-8` to
        "bleed" the button columns into that padding without shifting the text.
      */}
      <EditorContent editor={editor} className="px-8" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppTextEditor — root component
// ---------------------------------------------------------------------------

/**
 * Memoized TipTap rich-text editor with markdown support.
 *
 * Supports bold, italic, strikethrough, headings, bullet/ordered lists via
 * the bubble menu (text selection) and slash commands ("/").
 *
 * **Important:** stabilize `onChange` with `useCallback` at the call site.
 */
const AppTextEditor = React.memo(
  React.forwardRef<HTMLDivElement, AppTextEditorProps>((props, ref) => {
    // Only the caller-provided extra extensions — TipTapAdapter merges these
    // with BASE_EXTENSIONS and the configured CustomParagraph internally.
    const extraExtensions = useMemo(
      () => props.extensions ?? [],
      [props.extensions],
    )

    return (
      <div className={cn('w-full', props.className)}>
        <TipTapAdapter
          value={props.value}
          onChange={props.onChange}
          autoFocus={props.autoFocus}
          disabled={props.disabled}
          extensions={extraExtensions}
          forwardedRef={ref}
          streamingContent={props.streamingContent}
          onAddBelow={props.onAddBelow}
        />
      </div>
    )
  }),
)
AppTextEditor.displayName = 'AppTextEditor'

export { AppTextEditor }
