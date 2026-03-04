import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Eye, Share2, MoreHorizontal, Copy, Trash2, PenLine } from 'lucide-react'
import {
  AppButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from '@/components/app'
import { TextEditor } from '@/components/app/editor/TextEditor'
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ContentPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)

  // Task lifecycle via Redux
  const taskOptions = useMemo(() => (id ? { taskId: id } : undefined), [id])
  const task = useTaskSubmit<{ prompt: string }, { content?: string }>(
    'agent-text-completer',
    { prompt: '' },
    taskOptions,
  )

  const isEnhancing = task.isRunning || task.isQueued

  // Ref to track latest state for the debounced save
  const stateRef = useRef({ title, content })
  stateRef.current = { title, content }

  // Apply AI result to content on task completion
  useEffect(() => {
    if (task.isCompleted && task.result) {
      const aiOutput = task.result.content ?? ''
      setContent((prev) => prev + aiOutput)
      task.reset()
    }
  }, [task.isCompleted, task.result, task.reset])

  // Reset on error/cancel so the task can be reused
  useEffect(() => {
    if (task.isError || task.isCancelled) {
      task.reset()
    }
  }, [task.isError, task.isCancelled, task.reset])

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
        setTitle(output.metadata.title || '')
        setContent(output.content || '')
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
    const { title: t, content: c } = stateRef.current
    window.workspace.updateOutput({
      type: 'writings',
      id,
      content: c,
      metadata: { title: t },
    })
  }, [id, loaded])

  // Trigger debounced save whenever title or content change
  useEffect(() => {
    if (!loaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(persistToDisk, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [title, content, persistToDisk, loaded])

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const { charCount, wordCount } = useMemo(() => {
    const trimmed = content.trim()
    const chars = trimmed.length
    const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length
    return { charCount: chars, wordCount: words }
  }, [content])

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  // ---------------------------------------------------------------------------
  // Continue with AI
  // ---------------------------------------------------------------------------

  const handleContinueWithAI = useCallback(async (htmlContent: string) => {
    if (!id) return
    await task.submit({ prompt: htmlContent })
  }, [id, task.submit])

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
      navigate('/home')
    } catch (err) {
      console.error('[ContentPage] Failed to trash writing:', err)
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
        <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-2">
          <TextEditor
            value={content}
            onChange={handleContentChange}
            placeholder={t('writing.startWriting')}
            disabled={isEnhancing}
            onContinueWithAI={handleContinueWithAI}
            className={isEnhancing ? 'opacity-60' : undefined}
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
