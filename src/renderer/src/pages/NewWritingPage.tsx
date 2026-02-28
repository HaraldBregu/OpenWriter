import React, { useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Eye, Settings2, Share2, MoreHorizontal, Copy, Trash2, PenLine } from 'lucide-react'
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
import { useAppDispatch } from '../store'
import { removeEntry } from '../store/writingItemsSlice'
import { PersonalitySettingsPanel } from '@/components/personality/PersonalitySettingsSheet'
import { useDraftEditor } from '@/hooks/useDraftEditor'
import { usePageEnhancement } from '@/hooks/useBlockEnhancement'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ContentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const [showSidebar, setShowSidebar] = useState(true)

  const {
    isDraft,
    title,
    blocks,
    savedWritingItemIdRef,
    handleTitleChange,
    handleChange,
    handleDelete,
    handleAddBlockAfter,
    handleReorder,
    handleAppendBlock,
    handleChangeBlockType,
    handleChangeMedia,
    aiSettings,
    handleAiSettingsChange,
    focusBlockId,
  } = useDraftEditor(id, '/new/writing')

  // ---------------------------------------------------------------------------
  // AI Enhancement — owned at page level
  //
  // Content is streamed back through onChangeRef → Redux state → block.content
  // prop → AppTextEditor value → TipTap internal sync. No direct editor refs needed.
  // ---------------------------------------------------------------------------

  const onChangeRef = useRef(handleChange)
  onChangeRef.current = handleChange

  // Stable ref to a lookup function so usePageEnhancement can snapshot the
  // current block content without receiving blocks as a prop.
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const getBlockContent = useRef((blockId: string) =>
    blocksRef.current.find((b) => b.id === blockId)?.content ?? '',
  )

  const { enhancingBlockId, streamingEntry, handleEnhance } = usePageEnhancement({
    onChangeRef,
    getBlockContent,
  })

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const { charCount, wordCount } = useMemo(() => {
    const joined = blocks.map((b) => b.content).join(' ').trim()
    const chars = joined.length
    const words = joined.length === 0 ? 0 : joined.split(/\s+/).filter(Boolean).length
    return { charCount: chars, wordCount: words }
  }, [blocks])

  // Guard: existing writing not found in Redux
  if (!isDraft && blocks.length === 0 && title === '') {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>{t('writing.notFound')}</p>
      </div>
    )
  }

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
              {!isDraft && id && (
                <AppDropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    const writingItemId = savedWritingItemIdRef.current
                    if (writingItemId) {
                      try {
                        await window.workspace.deleteOutput({ type: 'writings', id: writingItemId })
                      } catch (err) {
                        console.error('[ContentPage] Failed to delete writing item from disk:', err)
                      }
                    }
                    dispatch(removeEntry(id))
                    navigate('/home')
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common.moveToTrash')}
                </AppDropdownMenuItem>
              )}
            </AppDropdownMenuContent>
          </AppDropdownMenu>
          <AppButton
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? t('common.hideSettings') : t('common.showSettings')}
          >
            <Settings2 className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden bg-background w-full">
        {/* Main content area */}
        <div className="overflow-y-auto flex-1 min-w-0 w-full">
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
                  onChangeMedia={handleChangeMedia}
                  onChangeType={handleChangeBlockType}
                  onDelete={handleDelete}
                  onAdd={handleAddBlockAfter}
                  onEnhance={handleEnhance}
                  isEnhancing={enhancingBlockId === block.id}
                  streamingContent={streamingEntry?.blockId === block.id ? streamingEntry.content : undefined}
                  placeholder={t('writing.startWriting')}
                  autoFocus={focusBlockId === block.id}
                />
              ))}
            </Reorder.Group>
            <ContentBlockPlaceholder onClick={handleAppendBlock} />
          </div>
        </div>

        {/*
          Right sidebar — two modes depending on viewport width:
          - lg+ (>= 1024px): inline flex column, no overlay behaviour.
          - < lg: fixed slide-over from the right, sits above content.
          Both modes are driven by `showSidebar`; only the positioning changes.
        */}

        {/* Backdrop — only visible on small screens when sidebar is open */}
        {showSidebar && (
          <div
            className="absolute inset-0 bg-black/30 lg:hidden z-10"
            onClick={() => setShowSidebar(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar panel */}
        <div
          className={[
            // Small-screen: fixed overlay sliding in from right
            'absolute top-0 right-0 h-full z-20 transition-transform duration-300 ease-in-out',
            showSidebar ? 'translate-x-0' : 'translate-x-full',
            // Large-screen: inline, no overlay — override the absolute positioning
            'lg:static lg:translate-x-0 lg:z-auto lg:transition-none',
            // Hide completely on large screens when closed (inline mode)
            !showSidebar && 'lg:hidden',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <PersonalitySettingsPanel
            settings={aiSettings}
            onSettingsChange={handleAiSettingsChange}
          />
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
