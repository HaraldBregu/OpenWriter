import React, { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus, GripVertical, ImagePlus, Link, X } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { AppButton } from '@/components/app'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageBlockData {
  id: string
  /** Data URL or file path of the image */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** ISO 8601 — set when the block is first created */
  createdAt: string
  /** ISO 8601 — updated whenever the block changes */
  updatedAt: string
}

export interface ImageBlockProps {
  block: ImageBlockData
  isOnly: boolean
  isLast?: boolean
  onChange: (id: string, src: string, alt: string) => void
  onDelete: (id: string) => void
  onAdd?: (afterId: string) => void
}

// ---------------------------------------------------------------------------
// ActionButton (matches ContentBlock pattern)
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  title: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

const ActionButton = React.memo(function ActionButton({
  title,
  onClick,
  disabled = false,
  children,
}: ActionButtonProps) {
  return (
    <AppButton
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="icon"
      className="h-6 w-6 rounded-none"
    >
      {children}
    </AppButton>
  )
})
ActionButton.displayName = 'ImageBlock.ActionButton'

// ---------------------------------------------------------------------------
// ImageBlock Component
// ---------------------------------------------------------------------------

export const ImageBlock = React.memo(function ImageBlock({
  block,
  isOnly,
  isLast = false,
  onChange,
  onDelete,
  onAdd,
}: ImageBlockProps): React.JSX.Element {
  const { t } = useTranslation()
  const dragControls = useDragControls()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const hasImage = Boolean(block.src)

  // ---- File selection via hidden input ----
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      readFileAsDataUrl(file, (dataUrl) => {
        onChange(block.id, dataUrl, block.alt || file.name)
      })
      // Reset the input so re-selecting the same file still fires onChange
      e.target.value = ''
    },
    [block.id, block.alt, onChange],
  )

  // ---- Drag-and-drop image ----
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (!file || !file.type.startsWith('image/')) return
      readFileAsDataUrl(file, (dataUrl) => {
        onChange(block.id, dataUrl, block.alt || file.name)
      })
    },
    [block.id, block.alt, onChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  // ---- Alt text editing ----
  const handleAltChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(block.id, block.src, e.target.value)
    },
    [block.id, block.src, onChange],
  )

  // ---- Remove current image (keep block) ----
  const handleClearImage = useCallback(() => {
    onChange(block.id, '', '')
  }, [block.id, onChange])

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
        <div className="flex-1 min-w-0 py-3">
          {hasImage ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={block.src}
                alt={block.alt}
                className="w-full h-auto max-h-[500px] object-contain bg-muted/20"
              />
              {/* Alt text input overlaid at the bottom */}
              <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-background">
                <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={block.alt}
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

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 shrink-0">
          {!hasImage && (
            <ActionButton
              title={t('imageBlock.selectImage')}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          <ActionButton
            title={t('imageBlock.delete')}
            onClick={() => onDelete(block.id)}
            disabled={isOnly}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      </div>

      {/* Separator with add button between blocks */}
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
ImageBlock.displayName = 'ImageBlock'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createImageBlock(src = '', alt = ''): ImageBlockData {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), src, alt, createdAt: now, updatedAt: now }
}

function readFileAsDataUrl(file: File, cb: (dataUrl: string) => void): void {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') cb(reader.result)
  }
  reader.readAsDataURL(file)
}

// ---------------------------------------------------------------------------
// InsertImageBlockPlaceholder
// ---------------------------------------------------------------------------

interface InsertImageBlockPlaceholderProps {
  onClick: () => void
}

export const InsertImageBlockPlaceholder = React.memo(function InsertImageBlockPlaceholder({
  onClick,
}: InsertImageBlockPlaceholderProps) {
  const { t } = useTranslation()
  return (
    <div className="px-5 py-2">
      <button
        type="button"
        onClick={onClick}
        className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-border/70 rounded-lg opacity-70 hover:opacity-80 transition-opacity cursor-pointer text-muted-foreground"
      >
        <ImagePlus className="h-4 w-4" />
        <span className="text-sm">{t('imageBlock.insertImage')}</span>
      </button>
    </div>
  )
})
InsertImageBlockPlaceholder.displayName = 'InsertImageBlockPlaceholder'
