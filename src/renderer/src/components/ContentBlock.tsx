import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Trash2, Plus, Copy, GripVertical,
  Bold, Italic, Strikethrough,
  List, ListOrdered,
  ImagePlus, Link, X, ChevronDown,
} from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import ListKeymap from '@tiptap/extension-list-keymap'
import { AppButton } from '@/components/app'
import {
  AppTooltip,
  AppTooltipTrigger,
  AppTooltipContent,
  AppTooltipProvider,
} from '@/components/app/AppTooltip'


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated union of all block types supported by the editor. */
export type BlockType = 'text' | 'heading' | 'media'

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
  /**
   * Trigger AI enhancement for this block. Provided by the parent page.
   * ContentBlock simply calls onEnhance(block.id) — the actual async logic
   * lives in NewWritingPage via usePageEnhancement.
   */
  onEnhance: (blockId: string) => void
  /** True while this specific block is being enhanced by the AI. */
  isEnhancing: boolean
  placeholder?: string
  /** When true the editor will grab focus immediately after mount. */
  autoFocus?: boolean
  /**
   * Called once when the TipTap editor instance is ready (or destroyed).
   * NewWritingPage stores these refs so it can read content during enhancement.
   */
  onEditorReady: (blockId: string, editor: Editor | null) => void
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
// EditorBubbleMenu (text blocks only)
// ---------------------------------------------------------------------------

interface BubbleMenuButtonProps {
  tooltip: string
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}

const BubbleMenuButton = React.memo(function BubbleMenuButton({
  tooltip,
  isActive,
  onClick,
  children,
}: BubbleMenuButtonProps): React.JSX.Element {
  return (
    <AppTooltip>
      <AppTooltipTrigger asChild>
        <AppButton
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={`h-7 w-7 rounded-md shrink-0 ${
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {children}
        </AppButton>
      </AppTooltipTrigger>
      <AppTooltipContent side="top" sideOffset={6}>
        <p className="text-xs">{tooltip}</p>
      </AppTooltipContent>
    </AppTooltip>
  )
})
BubbleMenuButton.displayName = 'BubbleMenuButton'

interface EditorBubbleMenuProps {
  editor: Editor | null
  onEnhance: () => void
  isEnhancing: boolean
}

const EditorBubbleMenu = React.memo(function EditorBubbleMenu({
  editor,
  onEnhance,
  isEnhancing,
}: EditorBubbleMenuProps): React.JSX.Element | null {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: 'top' }}
    >
      <AppTooltipProvider delayDuration={400}>
        <div className="flex items-center gap-0.5 px-1.5 py-1 bg-background border border-border rounded-lg shadow-md">
          {/* Text formatting group */}
          <BubbleMenuButton
            tooltip="Bold"
            isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </BubbleMenuButton>

          <BubbleMenuButton
            tooltip="Italic"
            isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </BubbleMenuButton>

          <BubbleMenuButton
            tooltip="Strikethrough"
            isActive={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </BubbleMenuButton>

          {/* Separator */}
          <div className="w-px h-4 bg-border mx-0.5 shrink-0" aria-hidden="true" />

          {/* Lists group */}
          <BubbleMenuButton
            tooltip="Bullet List"
            isActive={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </BubbleMenuButton>

          <BubbleMenuButton
            tooltip="Numbered List"
            isActive={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </BubbleMenuButton>

          {/* Separator */}
          <div className="w-px h-4 bg-border mx-0.5 shrink-0" aria-hidden="true" />

          {/* Enhance with AI */}
          <BubbleMenuButton
            tooltip="Enhance with AI"
            isActive={isEnhancing}
            onClick={onEnhance}
          >
            <Sparkles className={`h-3.5 w-3.5${isEnhancing ? ' animate-pulse' : ''}`} />
          </BubbleMenuButton>
        </div>
      </AppTooltipProvider>
    </BubbleMenu>
  )
})
EditorBubbleMenu.displayName = 'EditorBubbleMenu'

// ---------------------------------------------------------------------------
// TextBlockEditor — TipTap editor, only mounted for type==='text' blocks.
//
// Extracting this into its own component ensures useEditor() (a hook) is only
// called when the block is actually a text block. This avoids creating idle
// editor instances for heading/media blocks and upholds the Rules of Hooks
// (hooks are always called in the same order within a component, never
// conditionally skipped — we achieve this by only rendering this component
// when needed, not by guarding the hook call itself).
// ---------------------------------------------------------------------------

interface TextBlockEditorProps {
  block: Block
  onChangeRef: React.RefObject<(id: string, content: string) => void>
  blockIdRef: React.RefObject<string>
  onEditorReady: (blockId: string, editor: Editor | null) => void
  onEnhance: () => void
  isEnhancing: boolean
  autoFocus: boolean
  placeholder: string
}

const TextBlockEditor = React.memo(function TextBlockEditor({
  block,
  onChangeRef,
  blockIdRef,
  onEditorReady,
  onEnhance,
  isEnhancing,
  autoFocus,
  placeholder,
}: TextBlockEditorProps): React.JSX.Element {
  const [isEmpty, setIsEmpty] = useState<boolean>(() => !block.content || block.content === '<p></p>')

  const editorRef = useRef<Editor | null>(null)
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  const editorOptions = useMemo<UseEditorOptions>(() => ({
    extensions: [
      StarterKit.configure({ bulletList: false, orderedList: false, listItem: false }),
      BulletList,
      OrderedList,
      ListItem,
      ListKeymap,
      Markdown,
    ],
    content: block.content || '',
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }: { editor: Editor }) => {
      onChangeRef.current(blockIdRef.current, ed.getMarkdown())
      setIsEmpty(ed.isEmpty)
    },
    onCreate: ({ editor: ed }: { editor: Editor }) => {
      editorRef.current = ed
      onEditorReadyRef.current(blockIdRef.current, ed)
      setIsEmpty(ed.isEmpty)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[32em] py-2 text-base leading-relaxed text-foreground break-words',
      },
    },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor(editorOptions)

  // Keep ref in sync and notify parent when the editor changes.
  useEffect(() => {
    editorRef.current = editor ?? null
    onEditorReadyRef.current(blockIdRef.current, editor ?? null)
  }, [editor, blockIdRef])

  // Notify parent on unmount so the map entry is cleaned up.
  useEffect(() => {
    return () => {
      onEditorReadyRef.current(blockIdRef.current, null)
    }
  }, [blockIdRef])

  // Capture the initial autoFocus value at mount time. The parent clears
  // focusBlockId after one render, so we store it in a ref.
  const shouldAutoFocusRef = useRef(autoFocus)
  useEffect(() => {
    if (!shouldAutoFocusRef.current) return
    if (!editor || editor.isDestroyed) return
    shouldAutoFocusRef.current = false
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus('start')
    })
  }, [editor])

  // Disable the editor while AI enhancement is running.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!isEnhancing)
  }, [editor, isEnhancing])

  // Sync external content changes; guard while enhancing so streamed tokens
  // are not overwritten by echoed onChange calls.
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

  return (
    <div className={`relative overflow-hidden${isEnhancing ? ' opacity-60 pointer-events-none' : ''}`}>
      {isEmpty && (
        <span
          className="absolute inset-0 py-2.5 pointer-events-none select-none text-base leading-tight text-muted-foreground/50"
          aria-hidden="true"
        >
          {placeholder}
        </span>
      )}
      <EditorBubbleMenu editor={editor} onEnhance={onEnhance} isEnhancing={isEnhancing} />
      <EditorContent editor={editor} />
    </div>
  )
})
TextBlockEditor.displayName = 'TextBlockEditor'

// ---------------------------------------------------------------------------
// HeadingContent
// ---------------------------------------------------------------------------

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const
const headingTagClass: Record<number, string> = {
  1: 'text-4xl font-bold',
  2: 'text-3xl font-bold',
  3: 'text-2xl font-semibold',
  4: 'text-xl font-semibold',
  5: 'text-lg font-medium',
  6: 'text-base font-medium',
}

interface HeadingContentProps {
  block: Block
  onChange: (id: string, content: string) => void
  onChangeType: (id: string, type: BlockType, level?: Block['level']) => void
  autoFocus: boolean
  placeholder: string
}

const HeadingContent = React.memo(function HeadingContent({
  block,
  onChange,
  onChangeType,
  autoFocus,
  placeholder,
}: HeadingContentProps): React.JSX.Element {
  const { t } = useTranslation()
  const level = block.level ?? 1
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className="flex flex-col gap-2 py-1">
      {/* Level selector */}
      <div className="flex items-center gap-1">
        {HEADING_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onChangeType(block.id, 'heading', l as Block['level'])}
            className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
              level === l
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            H{l}
          </button>
        ))}
      </div>
      {/* Heading input */}
      <input
        ref={inputRef}
        type="text"
        value={block.content}
        onChange={(e) => onChange(block.id, e.target.value)}
        placeholder={placeholder || t('contentBlock.headingPlaceholder')}
        className={`w-full bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground leading-tight ${headingTagClass[level]}`}
      />
    </div>
  )
})
HeadingContent.displayName = 'HeadingContent'

// ---------------------------------------------------------------------------
// MediaContent (image block integrated from former ImageBlock.tsx)
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
// BlockTypeMenu — dropdown for switching block type
// ---------------------------------------------------------------------------

interface BlockTypeMenuProps {
  block: Block
  onChangeType: (id: string, type: BlockType, level?: Block['level']) => void
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: 'Text',
  heading: 'Heading',
  media: 'Image',
}

const BlockTypeMenu = React.memo(function BlockTypeMenu({ block, onChangeType }: BlockTypeMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 px-1 py-0.5 text-xs text-muted-foreground/50 hover:text-muted-foreground rounded transition-colors"
        title="Change block type"
      >
        {BLOCK_TYPE_LABELS[block.type]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[120px] bg-background border border-border rounded-md shadow-md py-1">
            {(['text', 'heading', 'media'] as BlockType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChangeType(block.id, t, t === 'heading' ? (block.level ?? 1) : undefined)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  block.type === t
                    ? 'text-foreground font-medium bg-muted/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                {BLOCK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
})
BlockTypeMenu.displayName = 'BlockTypeMenu'

// ---------------------------------------------------------------------------
// ContentBlock Component
// ---------------------------------------------------------------------------

export const ContentBlock = React.memo(function ContentBlock({
  block,
  isOnly,
  isLast = false,
  onChange,
  onChangeMedia,
  onChangeType,
  onDelete,
  onAdd,
  onEnhance,
  isEnhancing,
  placeholder = 'Type here...',
  autoFocus = false,
  onEditorReady,
}: ContentBlockProps): React.JSX.Element {
  const { t } = useTranslation()
  const dragControls = useDragControls()

  // Stable callback refs — these are passed through to TextBlockEditor so the
  // TipTap hooks inside that component never receive stale closures.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const blockIdRef = useRef(block.id)
  blockIdRef.current = block.id

  const handleEnhanceClick = useCallback(() => {
    onEnhance(block.id)
  }, [onEnhance, block.id])

  const handleCopy = useCallback(() => {
    if (block.type === 'heading') {
      navigator.clipboard.writeText(block.content)
    }
    // For 'text' blocks, copy is handled inside TextBlockEditor via the editor's
    // getText(). We don't have direct editor access here — rely on the bubbleMenu
    // or the OS copy shortcut when the block is focused.
  }, [block.type, block.content])

  // Heading and media blocks cannot be AI-enhanced.
  const canEnhance = block.type === 'text'

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

        {/* Content area — switches on block.type */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Block type switcher — shown on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <BlockTypeMenu block={block} onChangeType={onChangeType} />
          </div>

          {/*
            Each type renders its own sub-component. TextBlockEditor owns useEditor()
            so the hook is only ever called when the block is actually a text block,
            which keeps React hook call order stable and avoids idle editor instances.
          */}
          {block.type === 'text' && (
            <TextBlockEditor
              block={block}
              onChangeRef={onChangeRef}
              blockIdRef={blockIdRef}
              onEditorReady={onEditorReady}
              onEnhance={handleEnhanceClick}
              isEnhancing={isEnhancing}
              autoFocus={autoFocus}
              placeholder={placeholder}
            />
          )}

          {block.type === 'heading' && (
            <HeadingContent
              block={block}
              onChange={onChange}
              onChangeType={onChangeType}
              autoFocus={autoFocus}
              placeholder={placeholder}
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
          {block.type === 'heading' && (
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

export function createBlock(type: BlockType = 'text'): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), type, content: '', createdAt: now, updatedAt: now }
}
