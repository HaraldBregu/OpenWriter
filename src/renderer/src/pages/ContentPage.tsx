import React, { useState, useCallback, useMemo } from 'react'
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
// Page
// ---------------------------------------------------------------------------

const ContentPage: React.FC = () => {
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>(() => [createBlock()])
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)

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

  const handleDelete = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }, [])

  const handleAddBlockAfter = useCallback((afterId: string) => {
    const newBlock = createBlock()
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === afterId)
      return [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1),
      ]
    })
    setFocusBlockId(newBlock.id)
  }, [])

  const handleReorder = useCallback((reordered: Block[]) => {
    setBlocks(reordered)
  }, [])

  const handleAppendBlock = useCallback(() => {
    const newBlock = createBlock()
    setBlocks((prev) => [...prev, newBlock])
    setFocusBlockId(newBlock.id)
  }, [])

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
                onClick={() => {
                  setTitle('')
                  setBlocks([createBlock()])
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('common.moveToTrash')}
              </AppDropdownMenuItem>
            </AppDropdownMenuContent>
          </AppDropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <div className="w-full px-6 py-10 flex flex-col gap-2">
          <Reorder.Group
            axis="y"
            values={blocks}
            onReorder={handleReorder}
            className="flex flex-col gap-0"
          >
            {blocks.map((block, index) => (
              <ContentBlock
                key={block.id}
                block={block}
                isOnly={blocks.length === 1}
                isLast={index === blocks.length - 1}
                onChange={handleChange}
                onDelete={handleDelete}
                onAdd={handleAddBlockAfter}
                placeholder={t('writing.startWriting')}
                autoFocus={focusBlockId === block.id}
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
