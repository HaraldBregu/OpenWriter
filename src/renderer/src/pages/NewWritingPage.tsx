import React, { useMemo, useState } from 'react'
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
import { ContentBlock, InsertBlockPlaceholder } from '@/components/ContentBlock'
import { useAppDispatch } from '../store'
import { removeEntry } from '../store/writingItemsSlice'
import { PersonalitySettingsPanel } from '@/components/personality/PersonalitySettingsSheet'
import { useDraftEditor } from '@/hooks/useDraftEditor'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewWritingPage: React.FC = () => {
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
    aiSettings,
    handleAiSettingsChange,
    focusBlockId,
  } = useDraftEditor(id, '/new/writing')

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
                        console.error('[NewWritingPage] Failed to delete writing item from disk:', err)
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

      <div className="flex flex-1 overflow-hidden bg-background">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-2">
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
            <InsertBlockPlaceholder onClick={handleAppendBlock} />
          </div>
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <PersonalitySettingsPanel
            settings={aiSettings}
            onSettingsChange={handleAiSettingsChange}
          />
        )}
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

export default NewWritingPage
