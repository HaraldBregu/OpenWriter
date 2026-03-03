import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Eye, Share2, MoreHorizontal, Copy, Trash2, PenLine } from 'lucide-react'
import { Reorder } from 'framer-motion'
import {
  AppButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from '@/components/app'
import { ContentBlock } from '@/components/ContentBlock'
import { ContentBlockPlaceholder } from '@/components/ContentBlockPlaceholder'
import { createBlock, type Block } from '@/components/block.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an OutputFileBlock from disk into our local Block type. */
function toBlock(b: { name: string; content: string; createdAt: string; updatedAt: string }): Block {
  return {
    id: b.name,
    type: 'paragraph',
    content: b.content,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }
}

/** Convert local Block to the shape expected by workspace APIs. */
function toOutputBlock(b: Block) {
  return { name: b.id, content: b.content, createdAt: b.createdAt, updatedAt: b.updatedAt }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ContentPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>(() => [createBlock()])
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)

  // Ref to track latest state for the debounced save
  const stateRef = useRef({ title, blocks })
  stateRef.current = { title, blocks }

  // ---------------------------------------------------------------------------
  // Load from disk
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        const output = await window.workspace.loadOutput({ type: 'writings', id: id! })
        if (cancelled || !output) {
          if (!cancelled) setLoaded(true)
          return
        }
        const loadedBlocks = output.blocks.map(toBlock)
        setTitle(output.metadata.title || '')
        setBlocks(loadedBlocks.length > 0 ? loadedBlocks : [createBlock()])
        setLoaded(true)
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  // ---------------------------------------------------------------------------
  // Persist changes (debounced)
  // ---------------------------------------------------------------------------
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistToDisk = useCallback(() => {
    if (!id || !loaded) return
    const { title: t, blocks: b } = stateRef.current
    window.workspace.updateOutput({
      type: 'writings',
      id,
      blocks: b.map(toOutputBlock),
      metadata: { title: t },
    })
  }, [id, loaded])

  // Trigger debounced save whenever title or blocks change
  useEffect(() => {
    if (!loaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(persistToDisk, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [title, blocks, persistToDisk, loaded])

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const { charCount, wordCount } = useMemo(() => {
    const joined = blocks.map((b) => b.content).join(' ').trim()
    const chars = joined.length
    const words = joined.length === 0 ? 0 : joined.split(/\s+/).filter(Boolean).length
    return { charCount: chars, wordCount: words }
  }, [blocks])

  // ---------------------------------------------------------------------------
  // Block callbacks
  // ---------------------------------------------------------------------------

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
  }, [])

  const handleChange = useCallback((blockId: string, content: string) => {
    const now = new Date().toISOString()
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content, updatedAt: now } : b))
    )
  }, [])

  const handleReorder = useCallback((reordered: Block[]) => {
    setBlocks(reordered)
  }, [])

  const handleAppendBlock = useCallback(() => {
    const newBlock = createBlock()
    setBlocks((prev) => [...prev, newBlock])
    setFocusBlockId(newBlock.id)
  }, [])

  /**
   * Insert a new empty block immediately after the block identified by `afterId`
   * and move focus into it.  Called by ContentBlock's onAddBelow prop, which is
   * triggered when the user clicks the "+" gutter button inside any paragraph.
   */
  const handleDeleteBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      // Always keep at least one block so the editor is never empty.
      if (prev.length <= 1) return prev.map((b) => b.id === blockId ? { ...b, content: '' } : b)
      return prev.filter((b) => b.id !== blockId)
    })
  }, [])

  const handleAddBlockAfter = useCallback((afterId: string) => {
    const newBlock = createBlock()
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId)
      if (idx === -1) return [...prev, newBlock]
      const next = [...prev]
      next.splice(idx + 1, 0, newBlock)
      return next
    })
    setFocusBlockId(newBlock.id)
  }, [])

  // ---------------------------------------------------------------------------
  // Move to Trash
  // ---------------------------------------------------------------------------

  const handleMoveToTrash = useCallback(async () => {
    if (!id || isTrashing) return

    setIsTrashing(true)

    // Cancel any pending debounced save before navigating away.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    try {
      await window.workspace.trashOutput({ type: 'writings', id })
      // Navigate to home after a successful trash.
      // The AppLayout's onOutputFileChange listener will pick up the 'removed'
      // event emitted by OutputFilesService and refresh the sidebar list.
      navigate('/home')
    } catch (err) {
      console.error('[ContentPage] Failed to trash writing:', err)
      // Re-enable the button so the user can retry.
      setIsTrashing(false)
    }
  }, [id, isTrashing, navigate])

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PenLine className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('writing.titlePlaceholder')}
            className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full min-w-0"
          />
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <AppDropdownMenu>
            <AppDropdownMenuTrigger asChild>
              <AppButton
                type="button"
                variant="outline"
                size="icon"
                title={t('common.moreOptions')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </AppButton>
            </AppDropdownMenuTrigger>
            <AppDropdownMenuContent align="end">
              <AppDropdownMenuItem>
                <Eye className="h-4 w-4" />
                {t('common.preview')}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Download className="h-4 w-4" />
                {t('common.download')}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Share2 className="h-4 w-4" />
                {t('common.share')}
              </AppDropdownMenuItem>
              <AppDropdownMenuSeparator />
              <AppDropdownMenuItem>
                <Copy className="h-4 w-4" />
                {t('common.duplicate')}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isTrashing}
                onClick={handleMoveToTrash}
              >
                <Trash2 className="h-4 w-4" />
                {t('common.moveToTrash')}
              </AppDropdownMenuItem>
            </AppDropdownMenuContent>
          </AppDropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <div className="w-full px-10 py-10 flex flex-col gap-2">
          <Reorder.Group
            axis="y"
            values={blocks}
            onReorder={handleReorder}
            className="flex flex-col gap-0"
          >
            {blocks.map((block) => (
              <ContentBlock
                key={block.id}
                block={block}
                onChange={handleChange}
                placeholder={t('writing.startWriting')}
                autoFocus={focusBlockId === block.id}
                onAddBelow={handleAddBlockAfter}
              />
            ))}
          </Reorder.Group>
          <ContentBlockPlaceholder onClick={handleAppendBlock} />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end px-8 py-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {t('writing.charactersAndWords', { chars: charCount, words: wordCount })}
        </span>
      </div>
    </div>
  )
}

export default ContentPage
