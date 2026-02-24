import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles, Trash2, Plus, Copy, GripVertical } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import { type Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { AppButton } from '@/components/app'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Block {
  id: string
  content: string
}

export interface ContentBlockProps {
  block: Block
  isOnly: boolean
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
  onAdd?: (afterId: string) => void
  placeholder?: string
}

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  title: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}

const ActionButton = React.memo(function ActionButton({ title, onClick, disabled = false, children }: ActionButtonProps) {
  return (
    <AppButton
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      variant={"ghost"}
      size="icon"
      className={`h-6 w-6 rounded-none`}
    >
      {children}
    </AppButton>
  )
})
ActionButton.displayName = 'ActionButton'

// ---------------------------------------------------------------------------
// ContentBlock Component
// ---------------------------------------------------------------------------

export const ContentBlock = React.memo(function ContentBlock({
  block,
  isOnly,
  onChange,
  onDelete,
  onAdd,
  placeholder = 'Type here...',
}: ContentBlockProps): React.JSX.Element {
  const dragControls = useDragControls()

  // Track whether the editor is empty to conditionally show the placeholder span.
  const [isEmpty, setIsEmpty] = useState<boolean>(() => !block.content || block.content === '<p></p>')
  const [isEnhancing, setIsEnhancing] = useState(false)

  // Stable callback ref for onChange so useEditor options don't need to re-create the editor.
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const blockIdRef = React.useRef(block.id)
  blockIdRef.current = block.id

  // Refs for enhance-with-AI task management — avoids stale closures.
  const enhanceTaskIdRef = useRef<string | null>(null)
  const enhanceUnsubscribeRef = useRef<(() => void) | null>(null)
  const enhanceAccumulatedRef = useRef<string>('')

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: block.content || '',
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }: { editor: Editor }) => {
      onChangeRef.current(blockIdRef.current, ed.getMarkdown())
      setIsEmpty(ed.isEmpty)
    },
    onCreate: ({ editor: ed }: { editor: Editor }) => {
      setIsEmpty(ed.isEmpty)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[1em] text-base leading-tight text-foreground',
      },
    },
  })

  // Sync external content changes (e.g., when the block resets or is edited elsewhere).
  // Guard against our own onChange echoes by comparing current HTML first.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = editor.getMarkdown()
    const incoming = block.content || ''
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false, contentType: 'markdown' })
      setIsEmpty(editor.isEmpty)
    }
  }, [block.content, editor])

  // Cancel any in-flight enhance task on unmount.
  useEffect(() => {
    return () => {
      if (enhanceTaskIdRef.current) {
        window.task.cancel(enhanceTaskIdRef.current)
      }
      enhanceUnsubscribeRef.current?.()
    }
  }, [])

  const handleEnhance = useCallback(async () => {
    if (!editor || isEnhancing) return

    const currentText = editor.getMarkdown()

    if (!currentText.trim()) return

    setIsEnhancing(true)
    enhanceAccumulatedRef.current = ''

    // Register streaming event listener before starting inference.
    const unsubscribe = window.ai.onEvent((event) => {
      const data = event.data as { runId: string; token?: string; message?: string }

      if (data.runId !== enhanceRunIdRef.current) return

      if (event.type === 'token') {
        enhanceAccumulatedRef.current += data.token ?? ''
      } else if (event.type === 'done') {
        const enhanced = enhanceAccumulatedRef.current
        onChangeRef.current(blockIdRef.current, enhanced)
        setIsEnhancing(false)
        enhanceRunIdRef.current = null
        enhanceAccumulatedRef.current = ''
        enhanceUnsubscribeRef.current?.()
        enhanceUnsubscribeRef.current = null
      } else if (event.type === 'error') {
        console.error('[ContentBlock] Enhance error:', data.message)
        setIsEnhancing(false)
        enhanceRunIdRef.current = null
        enhanceAccumulatedRef.current = ''
        enhanceUnsubscribeRef.current?.()
        enhanceUnsubscribeRef.current = null
      }
    })

    enhanceUnsubscribeRef.current = unsubscribe

    try {
      const result = await window.ai.inference('enhance', { prompt: currentText })
      if (result.success) {
        enhanceRunIdRef.current = result.data.runId
      } else {
        console.error('[ContentBlock] Enhance inference failed:', result.error)
        setIsEnhancing(false)
        unsubscribe()
        enhanceUnsubscribeRef.current = null
      }
    } catch (err) {
      console.error('[ContentBlock] Enhance request threw:', err)
      setIsEnhancing(false)
      unsubscribe()
      enhanceUnsubscribeRef.current = null
    }
  }, [editor, isEnhancing])

  const handleCopy = useCallback(() => {
    if (!editor) return
    navigator.clipboard.writeText(editor.getText())
  }, [editor])

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      className="group relative px-5 py-2 cursor-default select-none"
      style={{ zIndex: 1 }}
    >
      <div className="flex items-start gap-3">
        {/* Left buttons group */}
        <div className="flex items-center gap-0.5 mt-2 group/buttons">
          {/* Plus button */}
          {onAdd && (
            <AppButton
              type="button"
              onClick={() => onAdd(block.id)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground/20 hover:text-muted-foreground/50 opacity-100 group-hover/buttons:opacity-100 rounded-none"
            >
              <Plus className="h-4 w-4" />
            </AppButton>
          )}

          {/* Drag handle */}
          <AppButton
            type="button"
            onPointerDown={(e) => dragControls.start(e)}
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 opacity-100 group-hover/buttons:opacity-100 touch-none rounded-none"
          >
            <GripVertical className="h-4 w-4" />
          </AppButton>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 relative py-3">
          {/* Placeholder shown when editor is empty */}
          {isEmpty && (
            <span
              className="absolute inset-0 py-3 pointer-events-none select-none text-base leading-tight text-muted-foreground/50"
              aria-hidden="true"
            >
              {placeholder}
            </span>
          )}
          <EditorContent editor={editor} />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 shrink-0">
          <ActionButton
            title={isEnhancing ? 'Enhancing…' : 'Enhance with AI'}
            onClick={handleEnhance}
            disabled={isEnhancing || isEmpty}
          >
            <Sparkles className={`h-3.5 w-3.5${isEnhancing ? ' animate-pulse' : ''}`} />
          </ActionButton>
          <ActionButton
            title="Copy"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton
            title="Delete"
            onClick={() => onDelete(block.id)}
            disabled={isOnly}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      </div>
    </Reorder.Item>
  )
})
ContentBlock.displayName = 'ContentBlock'

export function createBlock(): Block {
  return { id: crypto.randomUUID(), content: '' }
}

// ---------------------------------------------------------------------------
// InsertBlockPlaceholder
// ---------------------------------------------------------------------------

interface InsertBlockPlaceholderProps {
  onClick: () => void
}

export const InsertBlockPlaceholder = React.memo(function InsertBlockPlaceholder({ onClick }: InsertBlockPlaceholderProps) {
  return (
    <div className="px-5 py-2">
      <button
        type="button"
        onClick={onClick}
        className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-border/50 rounded-lg opacity-40 hover:opacity-80 transition-opacity cursor-pointer text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">Insert block</span>
      </button>
    </div>
  )
})
InsertBlockPlaceholder.displayName = 'InsertBlockPlaceholder'
