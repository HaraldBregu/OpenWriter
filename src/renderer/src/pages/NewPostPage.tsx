import React, { useState, useRef, useEffect } from 'react'
import { Pencil, Sparkles, Trash2, Plus, Copy, GripVertical, Send, Download, Eye, MoreHorizontal, X, Filter, Tag, Clock, Globe } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Radio } from '@/components/ui/radio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Block {
  id: string
  content: string
}

function createBlock(): Block {
  return { id: crypto.randomUUID(), content: '' }
}

// ---------------------------------------------------------------------------
// BlockItem
// ---------------------------------------------------------------------------

interface BlockItemProps {
  block: Block
  isOnly: boolean
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
}

function BlockItem({ block, isOnly, onChange, onDelete }: BlockItemProps) {
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
      className="group relative rounded-xl border border-border bg-background px-5 py-4 cursor-default select-none"
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={handleInput}
              onBlur={handleBlur}
              placeholder="Write something..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
              style={{ overflow: 'hidden' }}
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
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none
        ${danger
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewPostPage: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([createBlock()])
  const [category, setCategory] = useState('technology')
  const [tags, setTags] = useState<string[]>(['AI', 'Writing'])
  const [visibility, setVisibility] = useState('public')
  const [tagInput, setTagInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)

  const handleChange = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  const handleDelete = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  const handleAddBlock = () => {
    setBlocks(prev => [...prev, createBlock()])
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput)) {
      setTags(prev => [...prev, tagInput])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <h1 className="text-xl font-semibold text-foreground">New Post</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-2">

            <Reorder.Group
              axis="y"
              values={blocks}
              onReorder={setBlocks}
              className="flex flex-col gap-2"
            >
              {blocks.map(block => (
                <BlockItem
                  key={block.id}
                  block={block}
                  isOnly={blocks.length === 1}
                  onChange={handleChange}
                  onDelete={handleDelete}
                />
              ))}
            </Reorder.Group>

            {/* Add block */}
            <button
              type="button"
              onClick={handleAddBlock}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground/50 hover:border-border/80 hover:text-muted-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add block
            </button>

          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="w-72 border-l border-border bg-background overflow-y-auto">
            <div className="p-5 flex flex-col gap-5">

              {/* Close button */}
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Post Settings
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="secondary"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleRemoveTag(tag)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted/80 dark:bg-muted/40 dark:hover:bg-muted/60 text-xs text-foreground transition-colors"
                    >
                      {tag}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Visibility
                </Label>
                <div className="flex flex-col gap-1.5">
                  {['public', 'private', 'draft'].map(option => (
                    <Label key={option} className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                      <Radio
                        name="visibility"
                        value={option}
                        checked={visibility === option}
                        onChange={(e) => setVisibility(e.target.value)}
                      />
                      <span className="capitalize">{option}</span>
                    </Label>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Schedule
                </Label>
                <Input
                  type="datetime-local"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  className="w-full"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                >
                  Preview
                </Button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewPostPage
