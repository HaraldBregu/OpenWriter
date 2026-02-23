import React, { useState, useCallback } from 'react'
import { Save, StickyNote } from 'lucide-react'
import { AppButton, AppTextarea } from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import { saveOutputItem, selectOutputLoading, selectOutputError } from '../store/outputSlice'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewNotePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const isSaving = useAppSelector(selectOutputLoading)
  const saveError = useAppSelector(selectOutputError)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const canSave = title.trim().length > 0 || content.trim().length > 0

  const handleSave = useCallback(async () => {
    if (!canSave) return

    await dispatch(
      saveOutputItem({
        type: 'notes',
        title: title.trim() || 'Untitled Note',
        content,
        category: 'note',
        tags: [],
        visibility: 'private',
        provider: 'manual',
        model: '',
        temperature: 0,
        maxTokens: null,
        reasoning: false
      })
    )
  }, [canSave, title, content, dispatch])

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <StickyNote className="h-4 w-4 text-amber-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full min-w-0"
          />
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {saveError && (
            <span className="text-xs text-destructive max-w-48 truncate" title={saveError}>
              {saveError}
            </span>
          )}
          <AppButton
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </AppButton>
        </div>
      </div>

      {/* Content area — full height, minimal chrome */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-10">
          <AppTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Capture a quick thought..."
            className="w-full min-h-[50vh] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 text-base leading-relaxed p-0"
            autoFocus
          />
        </div>
      </div>

    </div>
  )
}

export default NewNotePage
