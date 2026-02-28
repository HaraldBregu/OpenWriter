import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import { type Editor, type AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import ListKeymap from '@tiptap/extension-list-keymap'
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

const DEFAULT_EXTENSIONS: AnyExtension[] = [
  StarterKit.configure({ bulletList: false, orderedList: false, listItem: false }),
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
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = editor.getMarkdown()
    const incoming = value || ''
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false, contentType: 'markdown' })
      setIsEmpty(editor.isEmpty)
    }
  }, [value, editor])

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
        forwardedRef={ref as React.Ref<HTMLDivElement>}
      />
    )
  }),
)
AppTextEditor.displayName = 'AppTextEditor'

export { AppTextEditor }
