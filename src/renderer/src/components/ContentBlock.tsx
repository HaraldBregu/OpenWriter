import React, { useState, useRef, useEffect } from 'react'
import { Pencil, Sparkles, Trash2, Plus, Copy, GripVertical } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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

function ActionButton({ title, onClick, disabled = false, danger = false, children }: ActionButtonProps) {
  return (
    <Button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="icon"
      className={`h-6 w-6 ${danger ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : ''}`}
    >
      {children}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// ContentBlock Component
// ---------------------------------------------------------------------------

export function ContentBlock({ block, isOnly, onChange, onDelete, onAdd }: ContentBlockProps) {
  const [editing, setEditing] = useState(block.content === '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragControls = useDragControls()

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(block.id, e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handleBlur = () => {
    if (block.content.trim()) setEditing(false)
  }

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      className="group relative rounded-xl border border-border bg-card text-card-foreground shadow-sm px-5 py-4 cursor-default select-none hover:shadow-md transition-shadow"
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start gap-3">
        {/* Plus button */}
        {onAdd && (
          <Button
            type="button"
            onClick={() => onAdd(block.id)}
            variant="ghost"
            size="icon"
            className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground/20 hover:text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Drag handle */}
        <Button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          variant="ghost"
          size="icon"
          className="mt-0.5 h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <Textarea
              ref={textareaRef}
              value={block.content}
              onChange={handleInput}
              onBlur={handleBlur}
              placeholder="Write something..."
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed border-0 ring-offset-0 focus-visible:ring-0 p-0"
              style={{ overflow: 'hidden', minHeight: 'auto' }}
            />
          ) : (
            <p
              className="text-sm text-foreground leading-relaxed whitespace-pre-wrap cursor-text"
              onClick={() => setEditing(true)}
            >
              {block.content}
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <ActionButton title="Edit" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton title="Enhance with AI" onClick={() => {/* TODO */}}>
            <Sparkles className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton title="Copy" onClick={() => navigator.clipboard.writeText(block.content)}>
            <Copy className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton title="Delete" onClick={() => onDelete(block.id)} disabled={isOnly} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      </div>
    </Reorder.Item>
  )
}

export function createBlock(): Block {
  return { id: crypto.randomUUID(), content: '' }
}
