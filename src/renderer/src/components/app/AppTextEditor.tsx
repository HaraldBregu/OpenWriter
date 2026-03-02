import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState, type UseEditorOptions } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type Editor, type AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import { Markdown } from '@tiptap/markdown'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import ListKeymap from '@tiptap/extension-list-keymap'
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADING_CLASS: Record<HeadingLevel, string> = {
  1: 'text-4xl font-bold',
  2: 'text-3xl font-bold',
  3: 'text-2xl font-semibold',
  4: 'text-xl font-semibold',
  5: 'text-lg font-medium',
  6: 'text-base font-medium',
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

const DEFAULT_EXTENSIONS: AnyExtension[] = [
  StarterKit.configure({ bulletList: false, orderedList: false, listItem: false, heading: false }),
  Heading.configure({ levels: HEADING_LEVELS as unknown as import('@tiptap/extension-heading').Level[] }),
  Markdown,
  BulletList,
  OrderedList,
  ListItem,
  ListKeymap,
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface BaseEditorProps {
  /** Current string value (plain text for HEADING, markdown for PARAGRAPH). */
  value: string
  /**
   * Called with the new value on every change.
   * Stabilize with `useCallback` at the call site to prevent unnecessary re-renders.
   */
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
}

export interface HeadingEditorProps extends BaseEditorProps {
  type: 'HEADING'
  /** Controls the font size/weight of the heading input. Defaults to `1`. */
  headingLevel?: HeadingLevel
  extensions?: never
}

export interface ParagraphEditorProps extends BaseEditorProps {
  type: 'PARAGRAPH'
  /**
   * Additional TipTap extensions merged after the built-in defaults.
   * Provide a stable reference (e.g. module-level constant or `useMemo`) to
   * avoid unnecessary editor re-creation.
   */
  extensions?: AnyExtension[]
  /**
   * Live streaming content that overrides `value` in the TipTap editor without
   * triggering `onChange` or Redux updates. Pass from the AI enhancement hook
   * to avoid re-rendering the whole page on every token.
   */
  streamingContent?: string
  headingLevel?: never
}

/** Discriminated union covering all supported editor variants. */
export type AppTextEditorProps = HeadingEditorProps | ParagraphEditorProps

// ---------------------------------------------------------------------------
// Internal: HeadingRenderer  (Strategy A)
// ---------------------------------------------------------------------------

interface HeadingRendererProps {
  value: string
  onChange: (value: string) => void
  placeholder: string | undefined
  autoFocus: boolean | undefined
  className: string | undefined
  disabled: boolean | undefined
  id: string | undefined
  headingLevel: HeadingLevel
  forwardedRef: React.Ref<HTMLInputElement>
}

const HeadingRenderer = React.memo(function HeadingRenderer({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
  disabled,
  id,
  headingLevel,
  forwardedRef,
}: HeadingRendererProps): React.JSX.Element {
  const fallbackRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    const el =
      (forwardedRef as React.RefObject<HTMLInputElement> | null)?.current ??
      fallbackRef.current
    el?.focus()
  }, [autoFocus, forwardedRef])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  )

  return (
    <div className={cn(className)}>
      <input
        ref={forwardedRef ?? fallbackRef}
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full bg-transparent border-none outline-none',
          'placeholder:text-muted-foreground/40 text-foreground leading-tight',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          HEADING_CLASS[headingLevel],
        )}
      />
    </div>
  )
})
HeadingRenderer.displayName = 'HeadingRenderer'

// ---------------------------------------------------------------------------
// Internal: BubbleMenuContent  (rendered into the element owned by BubbleMenuPlugin)
// ---------------------------------------------------------------------------

// Positioning and show/hide are fully delegated to TipTap's BubbleMenuPlugin
// (backed by FloatingUI). This component only renders the toolbar buttons.
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
      // Prevent mousedown from stealing focus away from the editor.
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-px rounded-lg border border-border bg-popover shadow-md p-1"
    >
      {/* Heading toggles: H1 H2 H3 */}
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

      {/* Inline format buttons */}
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

      {/* List buttons */}
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
// Internal: TipTapAdapter  (Adapter pattern — owns useEditor)
// ---------------------------------------------------------------------------

interface TipTapAdapterProps {
  value: string
  onChange: (value: string) => void
  placeholder: string | undefined
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  /** Already-merged extension list; must be a stable reference. */
  extensions: AnyExtension[]
  forwardedRef: React.Ref<HTMLDivElement>
  /** When set, this content is shown in the editor instead of `value` and does not trigger `onChange`. */
  streamingContent: string | undefined
}

function TipTapAdapter({
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  extensions,
  forwardedRef,
  streamingContent,
}: TipTapAdapterProps): React.JSX.Element {
  const [isEmpty, setIsEmpty] = useState<boolean>(() => !value)

  // Stable callback ref — prevents useEditor from re-creating when onChange identity changes.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions,
      content: value || '',
      contentType: 'markdown',
      immediatelyRender: false,
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
        onChangeRef.current(ed.getMarkdown())
        setIsEmpty(ed.isEmpty)
      },
      onCreate: ({ editor: ed }: { editor: Editor }) => {
        setIsEmpty(ed.isEmpty)
      },
      editorProps: {
        attributes: {
          class:
            'focus:outline-none py-2 text-base leading-relaxed text-foreground break-words',
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const editor = useEditor(editorOptions, [])

  // Sync external value → editor (controlled-component behaviour).
  // streamingContent takes priority over value during AI enhancement, letting
  // tokens render directly without triggering onChange or Redux dispatches.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = editor.getMarkdown()
    const incoming = streamingContent !== undefined ? streamingContent : (value || '')
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false, contentType: 'markdown' })
      setIsEmpty(editor.isEmpty)
    }
  }, [value, streamingContent, editor])

  // Sync disabled state → TipTap editable flag.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  // Auto-focus on first mount only.
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
      {isEmpty && placeholder && (
        <span
          className="absolute inset-0 py-2 pointer-events-none select-none text-base leading-relaxed text-muted-foreground/50"
          aria-hidden="true"
        >
          {placeholder}
        </span>
      )}
      <BubbleMenu editor={editor}>
        {editor && <BubbleMenuContent editor={editor} />}
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal: ParagraphRenderer  (Strategy B)
// ---------------------------------------------------------------------------

interface ParagraphRendererProps {
  value: string
  onChange: (value: string) => void
  placeholder: string | undefined
  autoFocus: boolean | undefined
  className: string | undefined
  disabled: boolean | undefined
  id: string | undefined
  extensions: AnyExtension[] | undefined
  forwardedRef: React.Ref<HTMLDivElement>
  streamingContent: string | undefined
}

const ParagraphRenderer = React.memo(function ParagraphRenderer({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
  disabled,
  extensions,
  forwardedRef,
  streamingContent,
}: ParagraphRendererProps): React.JSX.Element {
  // Merge consumer extensions after defaults. Stable reference required from call site.
  const mergedExtensions = useMemo(
    () =>
      extensions && extensions.length > 0
        ? [...DEFAULT_EXTENSIONS, ...extensions]
        : DEFAULT_EXTENSIONS,
    [extensions],
  )

  return (
    <div className={cn('w-full', className)}>
      <TipTapAdapter
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        extensions={mergedExtensions}
        forwardedRef={forwardedRef}
        streamingContent={streamingContent}
      />
    </div>
  )
})
ParagraphRenderer.displayName = 'ParagraphRenderer'

// ---------------------------------------------------------------------------
// Strategy registry  (Open/Closed — add a variant by adding an entry here)
// ---------------------------------------------------------------------------

const EDITOR_STRATEGIES = {
  HEADING: HeadingRenderer,
  PARAGRAPH: ParagraphRenderer,
} as const

// ---------------------------------------------------------------------------
// AppTextEditor — root component
// ---------------------------------------------------------------------------

/**
 * Memoized, type-safe TipTap editor wrapper.
 *
 * - `type="HEADING"` — plain text input with an H1–H6 level selector.
 * - `type="PARAGRAPH"` — full TipTap rich-text editor with markdown support
 *   (bold, italic, strikethrough, bullet list, ordered list).
 *
 * **Important:** stabilize `onChange` with `useCallback` at the call site.
 * An unstable function reference will defeat `React.memo` and cause
 * unnecessary re-renders of the editor.
 *
 * @example
 * // Heading
 * <AppTextEditor
 *   type="HEADING"
 *   value={title}
 *   onChange={handleTitleChange}
 *   headingLevel={1}
 *   onHeadingLevelChange={setHeadingLevel}
 * />
 *
 * // Paragraph
 * <AppTextEditor
 *   type="PARAGRAPH"
 *   value={body}
 *   onChange={handleBodyChange}
 *   placeholder="Start writing..."
 * />
 */
const AppTextEditor = React.memo(
  React.forwardRef<HTMLInputElement | HTMLDivElement, AppTextEditorProps>((props, ref) => {
    if (props.type === 'HEADING') {
      const HeadingComp = EDITOR_STRATEGIES.HEADING
      return (
        <HeadingComp
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          autoFocus={props.autoFocus}
          className={props.className}
          disabled={props.disabled}
          id={props.id}
          headingLevel={props.headingLevel ?? 1}
          forwardedRef={ref as React.Ref<HTMLInputElement>}
        />
      )
    }

    const ParagraphComp = EDITOR_STRATEGIES.PARAGRAPH
    return (
      <ParagraphComp
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        className={props.className}
        disabled={props.disabled}
        id={props.id}
        extensions={props.extensions}
        streamingContent={props.streamingContent}
        forwardedRef={ref as React.Ref<HTMLDivElement>}
      />
    )
  }),
)
AppTextEditor.displayName = 'AppTextEditor'

export { AppTextEditor }
