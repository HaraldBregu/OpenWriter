import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import type { Editor, AnyExtension } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import History from '@tiptap/extension-history'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  id?: string
  streamingContent?: string
  /**
   * Called when the user presses the pointer down on the drag handle grip.
   * Wire this to framer-motion's `dragControls.start(event)` in the parent to
   * initiate block reordering via `Reorder.Item`.
   */
  onDragHandlePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

const BASE_EXTENSIONS: AnyExtension[] = [
  Document,
  Text,
  Paragraph,
  Heading.configure({ levels: [1, 2, 3] }),
  History,
]

// ---------------------------------------------------------------------------
// DragHandle — rendered only when the consumer provides a handler.
// Sits in the left gutter, visible on group-hover.
// ---------------------------------------------------------------------------

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}

function DragHandle({ onPointerDown }: DragHandleProps): React.JSX.Element {
  return (
    <div
      // Prevent text selection and scroll interference during drag.
      className={cn(
        'absolute -left-7 top-1/2 -translate-y-1/2',
        'flex items-center justify-center',
        'h-6 w-6 rounded',
        'opacity-0 group-hover:opacity-100',
        'transition-opacity duration-150',
        'cursor-grab active:cursor-grabbing',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-accent',
        'touch-none select-none',
      )}
      onPointerDown={onPointerDown}
      // Prevent the editor from stealing pointer events while dragging.
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Drag to reorder block"
      role="button"
      tabIndex={-1}
    >
      <GripVertical className="h-4 w-4" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditorAdapter — owns the Tiptap editor instance.
// ---------------------------------------------------------------------------

function EditorAdapter({
  value,
  onChange,
  autoFocus,
  disabled,
  streamingContent,
  onDragHandlePointerDown,
  forwardedRef,
}: {
  value: string
  onChange: (value: string) => void
  autoFocus: boolean | undefined
  disabled: boolean | undefined
  streamingContent: string | undefined
  onDragHandlePointerDown: ((e: React.PointerEvent<HTMLDivElement>) => void) | undefined
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

  return (
    <div className="relative w-full" ref={forwardedRef}>
      {onDragHandlePointerDown !== undefined && (
        <DragHandle onPointerDown={onDragHandlePointerDown} />
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// TextEditor — public API, memoised outer shell.
// ---------------------------------------------------------------------------

const TextEditor = React.memo(
  React.forwardRef<HTMLDivElement, TextEditorProps>((props, ref) => {
    const {
      value,
      onChange,
      autoFocus,
      className,
      disabled,
      id,
      onDragHandlePointerDown,
    } = props

    const stableOnChange = useCallback(
      (html: string) => onChange(html),
      [onChange],
    )

    return (
      <div id={id} className={cn('group w-full', className)}>
        <EditorAdapter
          value={value}
          onChange={stableOnChange}
          autoFocus={autoFocus}
          disabled={disabled}
          forwardedRef={ref}
          streamingContent={props.streamingContent}
          onDragHandlePointerDown={onDragHandlePointerDown}
        />
      </div>
    )
  }),
)
TextEditor.displayName = 'TextEditor'

export { TextEditor }
