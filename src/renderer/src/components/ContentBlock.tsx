import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles, Trash2, Plus, Copy, GripVertical } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import { type Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { AppButton } from '@/components/app'
import { useTask } from '@/hooks/useTask'

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
  // taskId tracked in state so useEffect dependencies stay reactive.
  const [enhanceTaskId, setEnhanceTaskId] = useState<string | null>(null)

  // Stable callback ref for onChange so useEditor options don't need to re-create the editor.
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const blockIdRef = React.useRef(block.id)
  blockIdRef.current = block.id

  // Holds the original text before enhance started so we can revert on error/cancel.
  const originalTextRef = useRef<string>('')
  // Stable ref to the editor so the token event handler can access it without
  // being recreated on every render.
  const editorRef = useRef<Editor | null>(null)

  const { submitTask, cancelTask, tasks } = useTask()

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
      editorRef.current = ed
      setIsEmpty(ed.isEmpty)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[1em] text-base leading-tight text-foreground',
      },
    },
  })

  // Keep editorRef in sync whenever useEditor returns a new instance.
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Sync external content changes (e.g., when the block resets or is edited elsewhere).
  // Guard: skip while enhancing so streamed tokens are not overwritten by echoed onChange calls.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (isEnhancing) return
    const current = editor.getMarkdown()
    const incoming = block.content || ''
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false, contentType: 'markdown' })
      setIsEmpty(editor.isEmpty)
    }
  }, [block.content, editor, isEnhancing])

  // Stream tokens directly into the TipTap editor so the user sees them appear word by word.
  useEffect(() => {
    if (!enhanceTaskId) return
    const unsub = window.task.onEvent((event) => {
      if (event.type !== 'progress') return
      const data = event.data as { taskId: string; message?: string; detail?: { token?: string } }
      if (data.taskId !== enhanceTaskId || data.message !== 'token') return
      const token = data.detail?.token
      if (!token) return
      const ed = editorRef.current
      if (!ed || ed.isDestroyed) return
      // insertContent appends at the current cursor position (end of doc after the
      // separator we inserted in handleEnhance).
      ed.commands.insertContent(token)
    })
    return () => unsub()
  }, [enhanceTaskId])

  // React to task lifecycle changes tracked by useTask.
  useEffect(() => {
    if (!enhanceTaskId) return
    const taskState = tasks.get(enhanceTaskId)
    if (!taskState) return

    if (taskState.status === 'completed') {
      onChangeRef.current(blockIdRef.current, enhanceAccumulatedRef.current)
      enhanceAccumulatedRef.current = ''
      setIsEnhancing(false)
      setEnhanceTaskId(null)
    } else if (taskState.status === 'error') {
      console.error('[ContentBlock] Enhance error:', taskState.error)
      enhanceAccumulatedRef.current = ''
      setIsEnhancing(false)
      setEnhanceTaskId(null)
    } else if (taskState.status === 'cancelled') {
      enhanceAccumulatedRef.current = ''
      setIsEnhancing(false)
      setEnhanceTaskId(null)
    }
  }, [enhanceTaskId, tasks])

  // Cancel any in-flight enhance task on unmount.
  useEffect(() => {
    return () => {
      if (enhanceTaskId) cancelTask(enhanceTaskId)
    }
  }, [enhanceTaskId, cancelTask])

  const handleEnhance = useCallback(async () => {
    if (!editor || isEnhancing) return
    const currentText = editor.getMarkdown()
    if (!currentText.trim()) return

    setIsEnhancing(true)
    enhanceAccumulatedRef.current = ''

    const taskId = await submitTask('ai-enhance', { text: currentText })
    if (taskId) {
      setEnhanceTaskId(taskId)
    } else {
      setIsEnhancing(false)
    }
  }, [editor, isEnhancing, submitTask])

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
