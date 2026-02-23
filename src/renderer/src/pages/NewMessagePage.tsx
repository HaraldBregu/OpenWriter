import React, { useState, useCallback } from 'react'
import { Save, MessageSquare, Tag } from 'lucide-react'
import { AppButton, AppTextarea } from '@/components/app'
import { useAppDispatch, useAppSelector } from '../store'
import { saveOutputItem, selectOutputLoading, selectOutputError } from '../store/outputSlice'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewMessagePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const isSaving = useAppSelector(selectOutputLoading)
  const saveError = useAppSelector(selectOutputError)

  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const canSave = subject.trim().length > 0 || content.trim().length > 0

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  const handleSave = useCallback(async () => {
    if (!canSave) return

    await dispatch(
      saveOutputItem({
        type: 'messages',
        title: subject.trim() || 'Untitled Message',
        content,
        category: 'message',
        tags: parsedTags,
        visibility: 'private',
        provider: 'manual',
        model: '',
        temperature: 0,
        maxTokens: null,
        reasoning: false
      })
    )
  }, [canSave, subject, content, parsedTags, dispatch])

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <MessageSquare className="h-4 w-4 text-green-500 shrink-0" />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
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
            {isSaving ? 'Saving...' : 'Save Message'}
          </AppButton>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-10 flex flex-col gap-6">

          {/* Tags row */}
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full"
            />
          </div>

          {/* Message content */}
          <AppTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message..."
            className="w-full min-h-[50vh] resize-none border-none bg-transparent shadow-none focus-visible:ring-0 text-base leading-relaxed p-0"
            autoFocus
          />

        </div>
      </div>

    </div>
  )
}

export default NewMessagePage
