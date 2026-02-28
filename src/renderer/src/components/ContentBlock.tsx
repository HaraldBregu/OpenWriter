import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Trash2, Plus, Copy, GripVertical,
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, Quote,
} from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { useEditor, EditorContent, type UseEditorOptions } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { AppButton } from '@/components/app'
import {
  AppTooltip,
  AppTooltipTrigger,
  AppTooltipContent,
  AppTooltipProvider,
} from '@/components/app/AppTooltip'
import { useBlockEnhancement } from '@/hooks/useBlockEnhancement'


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Block {
  id: string
  content: string
  /** ISO 8601 — set when the block is first created */
  createdAt: string
  /** ISO 8601 — updated whenever the block content changes */
  updatedAt: string
}

export interface ContentBlockProps {
  block: Block
  isOnly: boolean
  isLast?: boolean
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
  onAdd?: (afterId: string) => void
  placeholder?: string
  /** When true the editor will grab focus immediately after mount. Used to
   * auto-focus a newly inserted block created by pressing Enter. */
  autoFocus?: boolean
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
// EditorBubbleMenu
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

          {/* Lists and blockquote group */}
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

          <BubbleMenuButton
            tooltip="Blockquote"
            isActive={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-3.5 w-3.5" />
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
// ContentBlock Component
// ---------------------------------------------------------------------------

export const ContentBlock = React.memo(function ContentBlock({
  block,
  isOnly,
  isLast = false,
  onChange,
  onDelete,
  onAdd,
  placeholder = 'Type here...',
  autoFocus = false,
}: ContentBlockProps): React.JSX.Element {
  const { t } = useTranslation()
  const dragControls = useDragControls()

  // Track whether the editor is empty to conditionally show the placeholder span.
  const [isEmpty, setIsEmpty] = useState<boolean>(() => !block.content || block.content === '<p></p>')

  // Stable callback refs so useEditor options never need to re-create the editor.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const blockIdRef = useRef(block.id)
  blockIdRef.current = block.id
  // Stable ref to the editor so the enhancement hook can access it without
  // being recreated on every render.
  const editorRef = useRef<Editor | null>(null)

  const { isEnhancing, handleEnhance } = useBlockEnhancement({ editorRef, onChangeRef, blockIdRef })

  const editorOptions = useMemo<UseEditorOptions>(() => ({
    extensions: [StarterKit, Markdown],
    content: block.content || '',
    // Tell TipTap to parse the initial content string as Markdown so that
    // paragraph breaks (blank lines) are correctly mapped to <p> nodes.
    // Without this, TipTap treats the string as HTML, collapses \n\n into
    // a single text run, and all paragraph structure is lost.
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
        class: 'focus:outline-none min-h-[32em] py-2 text-base leading-relaxed text-foreground break-words',
      },
    },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor(editorOptions)

  // Keep editorRef in sync whenever useEditor returns a new instance.
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Capture the initial autoFocus value at mount time. The parent clears
  // focusBlockId after one render, so the prop may flip to false before
  // TipTap finishes initialising the editor. Storing the initial value in a
  // ref lets us honour the intent even when the prop is already gone.
  const shouldAutoFocusRef = useRef(autoFocus)
  useEffect(() => {
    if (!shouldAutoFocusRef.current) return
    if (!editor || editor.isDestroyed) return
    shouldAutoFocusRef.current = false
    // Defer to the next microtask so the DOM is fully committed before focusing.
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus('start')
    })
  }, [editor])

  // Disable the editor while AI enhancement is running so the user cannot
  // type into the block and interfere with streamed tokens.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!isEnhancing)
  }, [editor, isEnhancing])

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

  const handleCopy = useCallback(() => {
    if (!editor) return
    navigator.clipboard.writeText(editor.getText())
  }, [editor])

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

        {/* Content */}
        <div className={`flex-1 min-w-0 relative overflow-hidden${isEnhancing ? ' opacity-60 pointer-events-none' : ''}`}>
          {/* Placeholder shown when editor is empty */}
          {isEmpty && (
            <span
              className="absolute inset-0 py-2.5 pointer-events-none select-none text-base leading-tight text-muted-foreground/50"
              aria-hidden="true"
            >
              {placeholder}
            </span>
          )}
          <EditorBubbleMenu editor={editor} onEnhance={handleEnhance} isEnhancing={isEnhancing} />
          <EditorContent editor={editor} />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 shrink-0 my-2">
          <ActionButton
            title={isEnhancing ? t('contentBlock.enhancing') : t('contentBlock.enhanceWithAI')}
            onClick={handleEnhance}
            disabled={isEnhancing || isEmpty}
          >
            <Sparkles className={`h-3.5 w-3.5${isEnhancing ? ' animate-pulse' : ''}`} />
          </ActionButton>
          <ActionButton
            title={t('contentBlock.copy')}
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </ActionButton>
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

export function createBlock(): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), content: '', createdAt: now, updatedAt: now }
}
