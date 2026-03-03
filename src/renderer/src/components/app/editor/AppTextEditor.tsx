import React, { useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent, useEditorState, type UseEditorOptions } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type Editor, type AnyExtension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold as BoldIcon, Italic as ItalicIcon, Strikethrough, Code as CodeIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockItem } from './extensions/BlockItem'

// ---------------------------------------------------------------------------
// Custom document — restricts top-level content to blockItem nodes only.
// TipTap will reject any attempt to insert paragraph, heading, list, etc.
// ---------------------------------------------------------------------------

const BlockDocument = Document.extend({ content: 'blockItem+' })

// ---------------------------------------------------------------------------
// Base extensions — stable, defined at module level.
// BlockItem is intentionally excluded here and configured per-instance so
// that onAddBelow / onDelete / onEnhance callbacks can be wired as stable
// ref wrappers without triggering editor re-creation.
// ---------------------------------------------------------------------------

const BASE_EXTENSIONS: AnyExtension[] = [
  BlockDocument,
  Text,
  Bold,
  Italic,
  Strike,
  Code,
  History,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'blockItem') {
        return 'Write something…'
      }
      return ''
    },
  }),
]

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
// Internal: BubbleMenuContent
// ---------------------------------------------------------------------------

function BubbleMenuContent({ editor }: { editor: Editor }): React.JSX.Element {
  const { isBold, isItalic, isStrike, isCode } = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isStrike: ctx.editor.isActive('strike'),
      isCode: ctx.editor.isActive('code'),
    }),
  })

  const btn = 'p-1.5 rounded transition-colors cursor-pointer select-none'
  const btnActive = 'bg-foreground text-background'
  const btnIdle = 'text-foreground/70 hover:bg-muted hover:text-foreground'

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-px rounded-lg border border-border bg-popover shadow-md p-1"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(btn, isBold ? btnActive : btnIdle)}
      >
        <BoldIcon size={15} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(btn, isItalic ? btnActive : btnIdle)}
      >
        <ItalicIcon size={15} strokeWidth={2} />
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
        <CodeIcon size={15} strokeWidth={2} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal: EditorAdapter
// ---------------------------------------------------------------------------

interface EditorAdapterProps {
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

function EditorAdapter({
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
}: EditorAdapterProps): React.JSX.Element {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const onAddBelowRef = useRef(onAddBelow)
  onAddBelowRef.current = onAddBelow
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const onEnhanceRef = useRef(onEnhance)
  onEnhanceRef.current = onEnhance

  const internalChangeRef = useRef(false)

  const allExtensions = useMemo<AnyExtension[]>(
    () => [
      ...BASE_EXTENSIONS,
      BlockItem.configure({
        onAddBelow: (pos: number) => onAddBelowRef.current?.(pos),
        onDelete: (pos: number) => onDeleteRef.current?.(pos),
        onEnhance: (pos: number) => onEnhanceRef.current?.(pos),
      }),
      ...extensions,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extensions],
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
          class: 'focus:outline-none py-2 text-lg leading-relaxed text-foreground break-words',
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allExtensions],
  )

  const editor = useEditor(editorOptions, [])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (streamingContent !== undefined) {
      const current = editor.getHTML()
      if (current !== streamingContent) {
        editor.commands.setContent(streamingContent, false)
      }
      return
    }

    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }

    const current = editor.getHTML()
    if (current !== (value || '')) {
      editor.commands.setContent(value || '', false)
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
      <EditorContent editor={editor} className="px-8" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppTextEditor — root component
// ---------------------------------------------------------------------------

const AppTextEditor = React.memo(
  React.forwardRef<HTMLDivElement, AppTextEditorProps>((props, ref) => {
    const extraExtensions = useMemo(
      () => props.extensions ?? [],
      [props.extensions],
    )

    return (
      <div className={cn('w-full', props.className)}>
        <EditorAdapter
          value={props.value}
          onChange={props.onChange}
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
