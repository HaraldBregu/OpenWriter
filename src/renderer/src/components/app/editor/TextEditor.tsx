import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import type { Editor, AnyExtension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import History from '@tiptap/extension-history'
import { cn } from '@/lib/utils'
import { BlockControls, GUTTER_WIDTH } from './BlockControls'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
  streamingContent?: string
}

// ---------------------------------------------------------------------------
// Base extensions
// ---------------------------------------------------------------------------

const BASE_EXTENSIONS: AnyExtension[] = [
  Document,
  Text,
  Paragraph,
  Heading.configure({ levels: [1, 2, 3] }),
  History,
]

// ---------------------------------------------------------------------------
// EditorAdapter — owns the Tiptap editor instance.
// ---------------------------------------------------------------------------

function EditorAdapter({
  value,
  onChange,
  autoFocus,
  disabled,
  streamingContent,
  forwardedRef,
}: {
  value: string
  onChange: (value: string) => void
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  streamingContent: string | undefined
  forwardedRef: React.Ref<HTMLDivElement>
}): React.JSX.Element {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const internalChangeRef = useRef(false)

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions: BASE_EXTENSIONS,
      content: value || '',
      immediatelyRender: false,
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const editor = useEditor(editorOptions, [])

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

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const didAutoFocus = useRef(false)
  useEffect(() => {
    if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed)
      return
    didAutoFocus.current = true
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus('start')
    })
  }, [editor, autoFocus])

  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative w-full" ref={forwardedRef}>
      <div
        ref={containerRef}
        className="relative"
        style={{ paddingLeft: GUTTER_WIDTH }}
      >
        {editor && (
          <BlockControls editor={editor} containerRef={containerRef} />
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TextEditor — public API, memoised outer shell.
// ---------------------------------------------------------------------------

const TextEditor = React.memo(
  React.forwardRef<HTMLDivElement, TextEditorProps>((props, ref) => {
    const { value, onChange, autoFocus, className, disabled, id } = props

    const stableOnChange = useCallback(
      (html: string) => onChange(html),
      [onChange],
    )

    return (
      <div id={id} className={cn('w-full', className)}>
        <EditorAdapter
          value={value}
          onChange={stableOnChange}
          autoFocus={autoFocus}
          disabled={disabled}
          forwardedRef={ref}
          streamingContent={props.streamingContent}
        />
      </div>
    )
  }),
)
TextEditor.displayName = 'TextEditor'

export { TextEditor }
