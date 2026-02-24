import React, { useRef, useEffect } from 'react'
import { Sparkles, Trash2, Plus, Copy, GripVertical } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { AppButton } from '@/components/app'
import { AppTextarea } from '@/components/app'

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

export const ContentBlock = React.memo(function ContentBlock({ block, isOnly, onChange, onDelete, onAdd, placeholder = 'Write something...' }: ContentBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragControls = useDragControls()

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [block.content])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(block.id, e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

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
        <div className="flex items-center gap-0.5 mt-0.5 group/buttons">
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
        <div className="flex-1 min-w-0">
          <AppTextarea
            ref={textareaRef}
            value={block.content}
            onChange={handleInput}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 leading-normal border-0 p-0 rounded-none m-0 overflow-hidden min-h-[1em] outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 shrink-0">
          <ActionButton
            title="Enhance with AI"
            onClick={() => {
              /* TODO */
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton
            title="Copy"
            onClick={() => navigator.clipboard.writeText(block.content)}
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
  );
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
