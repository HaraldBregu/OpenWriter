import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  selectIsBlockEnhancing,
  selectBlockStreamingContent,
} from '@/store/enhancementSlice'
import { startEnhancement } from '@/services/enhancementService'
import {
  Sparkles, Trash2, Plus, Copy, GripVertical,
  ImagePlus, Link, X,
} from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { AppButton } from '@/components/app'
import { AppTextEditor } from '@/components/app/AppTextEditor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated union of all block types supported by the editor. */
export type BlockType = 'paragraph' | 'heading' | 'media'

export interface Block {
  id: string
  /** Determines how the block is rendered and what fields are relevant. */
  type: BlockType
  /**
   * Heading level (1–6). Only meaningful when type === 'heading'.
   * Omitted for 'text' and 'media' blocks.
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6
  /**
   * Rich-text / markdown content. Used by 'text' blocks.
   * 'heading' blocks store plain-text title here as well.
   * Empty string for 'media' blocks.
   */
  content: string
  /**
   * Image source (data URL or file path). Only meaningful when type === 'media'.
   */
  mediaSrc?: string
  /**
   * Alt text for the media. Only meaningful when type === 'media'.
   */
  mediaAlt?: string
  /** ISO 8601 — set when the block is first created */
  createdAt: string
  /** ISO 8601 — updated whenever the block content changes */
  updatedAt: string
}

export interface ContentBlockProps {
  block: Block
  isOnly: boolean
  isLast?: boolean
  /** Called when block rich-text / heading content changes. */
  onChange: (id: string, content: string) => void
  /** Called when the block's media src / alt changes. */
  onChangeMedia: (id: string, mediaSrc: string, mediaAlt: string) => void
  /** Called when the user switches this block to a different type or heading level. */
  onChangeType: (id: string, type: BlockType, level?: Block['level']) => void
  onDelete: (id: string) => void
  onAdd?: (afterId: string) => void
  placeholder?: string
  /** When true the editor will grab focus immediately after mount. */
  autoFocus?: boolean
  /** @deprecated TipTap is now managed internally by AppTextEditor. This prop is ignored. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditorReady?: (blockId: string, editor: any) => void
}

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  title: string
  onClick: () => void
  disabled?: boolean
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
// MediaContent (image block)
// ---------------------------------------------------------------------------

interface MediaContentProps {
  block: Block
  onChangeMedia: (id: string, mediaSrc: string, mediaAlt: string) => void
}

function readFileAsDataUrl(file: File, cb: (dataUrl: string) => void): void {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') cb(reader.result)
  }
  reader.readAsDataURL(file)
}

const MediaContent = React.memo(function MediaContent({
  block,
  onChangeMedia,
}: MediaContentProps): React.JSX.Element {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const hasImage = Boolean(block.mediaSrc)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      readFileAsDataUrl(file, (dataUrl) => {
        onChangeMedia(block.id, dataUrl, block.mediaAlt || file.name)
      })
      e.target.value = ''
    },
    [block.id, block.mediaAlt, onChangeMedia],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (!file || !file.type.startsWith('image/')) return
      readFileAsDataUrl(file, (dataUrl) => {
        onChangeMedia(block.id, dataUrl, block.mediaAlt || file.name)
      })
    },
    [block.id, block.mediaAlt, onChangeMedia],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleAltChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChangeMedia(block.id, block.mediaSrc ?? '', e.target.value)
    },
    [block.id, block.mediaSrc, onChangeMedia],
  )

  const handleClearImage = useCallback(() => {
    onChangeMedia(block.id, '', '')
  }, [block.id, onChangeMedia])

  return (
    <div className="flex-1 min-w-0 py-3">
      {hasImage ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={block.mediaSrc}
            alt={block.mediaAlt}
            className="w-full h-auto max-h-[500px] object-contain bg-muted/20"
          />
          {/* Alt text input overlaid at the bottom */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-background">
            <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={block.mediaAlt ?? ''}
              onChange={handleAltChange}
              placeholder={t('imageBlock.altPlaceholder')}
              className="flex-1 text-xs text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          {/* Clear button */}
          <button
            type="button"
            onClick={handleClearImage}
            className="absolute top-2 right-2 p-1 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border transition-colors"
            title={t('imageBlock.removeImage')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Empty state — drop zone / file picker */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 py-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            isDragOver
              ? 'border-primary/50 bg-primary/5'
              : 'border-border/70 hover:border-border hover:bg-muted/20'
          }`}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
          <span className="text-sm text-muted-foreground/60">
            {t('imageBlock.dropOrClick')}
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
})
MediaContent.displayName = 'MediaContent'

// ---------------------------------------------------------------------------
// ContentBlock Component
// ---------------------------------------------------------------------------

export const ContentBlock = React.memo(function ContentBlock({
  block,
  isOnly,
  isLast = false,
  onChange,
  onChangeMedia,
  onDelete,
  onAdd,
  placeholder = 'Type here...',
  autoFocus = false,
}: ContentBlockProps): React.JSX.Element {
  const { t } = useTranslation()
  const dragControls = useDragControls()

  // ---------------------------------------------------------------------------
  // AI Enhancement — inline task submission + streaming
  // ---------------------------------------------------------------------------
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string | undefined>(undefined)

  // Stable ref to the active unsub so the cleanup effect always sees it.
  const unsubRef = useRef<(() => void) | null>(null)

  // Cancel on unmount so we don't write to unmounted state.
  useEffect(() => {
    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [])

  const handleEnhanceClick = useCallback(async () => {
    if (isEnhancing) return
    const text = block.content
    if (!text.trim()) return
    if (typeof window.tasksManager?.submit !== 'function') return

    setIsEnhancing(true)
    setStreamingContent(text)

    let taskId: string
    try {
      const result = await window.tasksManager.submit('ai-enhance', { text })
      if (!result.success) {
        setIsEnhancing(false)
        setStreamingContent(undefined)
        return
      }
      taskId = result.data.taskId
    } catch {
      setIsEnhancing(false)
      setStreamingContent(undefined)
      return
    }

    // Accumulate stream tokens seeded with original content.
    let buffer = text

    const unsub = subscribeToTask(taskId, (snap) => {
      if (snap.streamedContent) {
        buffer = text + snap.streamedContent
        setStreamingContent(buffer)
      }
      if (snap.status === 'completed') {
        onChange(block.id, buffer)
        setStreamingContent(undefined)
        setIsEnhancing(false)
        unsubRef.current = null
        unsub()
      } else if (snap.status === 'error' || snap.status === 'cancelled') {
        // Revert — do not call onChange, streaming clears.
        setStreamingContent(undefined)
        setIsEnhancing(false)
        unsubRef.current = null
        unsub()
      }
    })

    unsubRef.current = unsub
  }, [isEnhancing, block.id, block.content, onChange])

  // Adapt AppTextEditor's (value: string) => void to ContentBlock's (id, content) => void
  const handleChange = useCallback(
    (content: string) => onChange(block.id, content),
    [onChange, block.id],
  )

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.content)
  }, [block.content])

  // Only paragraph blocks can be AI-enhanced.
  const canEnhance = block.type === 'paragraph'

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      className="group relative px-5 py-4 cursor-default select-none"
      style={{ zIndex: 1 }}
    >
      <div className="flex items-start gap-3">
        {/* Left buttons group */}
        <div className="flex items-center gap-0.5 mt-2 group/buttons">
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

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {block.type === 'paragraph' && (
            <AppTextEditor
              type="PARAGRAPH"
              value={block.content}
              onChange={handleChange}
              placeholder={placeholder}
              autoFocus={autoFocus}
              disabled={isEnhancing}
              streamingContent={streamingContent}
              className={isEnhancing ? 'opacity-60' : undefined}
            />
          )}

          {block.type === 'heading' && (
            <AppTextEditor
              type="HEADING"
              value={block.content}
              onChange={handleChange}
              placeholder={placeholder}
              autoFocus={autoFocus}
              headingLevel={block.level ?? 1}
            />
          )}

          {block.type === 'media' && (
            <MediaContent block={block} onChangeMedia={onChangeMedia} />
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 shrink-0 my-2">
          {canEnhance && (
            <ActionButton
              title={isEnhancing ? t('contentBlock.enhancing') : t('contentBlock.enhanceWithAI')}
              onClick={handleEnhanceClick}
              disabled={isEnhancing}
            >
              <Sparkles className={`h-3.5 w-3.5${isEnhancing ? ' animate-pulse' : ''}`} />
            </ActionButton>
          )}
          {block.type !== 'media' && (
            <ActionButton
              title={t('contentBlock.copy')}
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          <ActionButton
            title={t('contentBlock.delete')}
            onClick={() => onDelete(block.id)}
            disabled={isOnly}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      </div>

      {onAdd && !isLast && (
        <div
          className="group/add ml-[3.4rem] h-3 hover:h-8 transition-all duration-200 flex items-center justify-center rounded cursor-pointer bg-muted/2 hover:bg-muted/30"
          onClick={() => onAdd(block.id)}
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/add:opacity-100 transition-opacity duration-150" />
        </div>
      )}
    </Reorder.Item>
  )
})
ContentBlock.displayName = 'ContentBlock'

export function createBlock(type: BlockType = 'paragraph'): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), type, content: '', createdAt: now, updatedAt: now }
}
