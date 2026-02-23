import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Send, StopCircle, AlertCircle, Loader2, Save, Check, ChevronDown } from 'lucide-react'
import { AppButton } from '@/components/app/AppButton'
import {
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuTrigger
} from '@/components/app'
import { useAI } from '@/hooks/useAI'
import { useAppDispatch, useAppSelector } from '@/store'
import { saveBrainFile, selectBrainFilesLoading, selectLastSaved, clearLastSaved, loadBrainFiles, selectBrainFilesBySection } from '@/store/brainFilesSlice'
import type { SaveBrainFileInput, BrainFile } from '@/store/brainFilesSlice'
export interface BrainSimpleLayoutProps {
  sectionId: string
  systemPrompt?: string
  placeholder?: string
  providerId?: string
  icon: React.ReactNode
  title: string
}

export const BrainSimpleLayout: React.FC<BrainSimpleLayoutProps> = React.memo(({
  sectionId,
  systemPrompt,
  placeholder = 'Ask a question...',
  providerId = 'openai',
  icon,
  title
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [loadedConversation, setLoadedConversation] = useState<BrainFile | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const dispatch = useAppDispatch()
  const isSaving = useAppSelector(selectBrainFilesLoading)
  const lastSaved = useAppSelector(selectLastSaved)

  // Get files for this section for the dropdown
  const files = useAppSelector(
    selectBrainFilesBySection(sectionId as 'principles' | 'consciousness' | 'memory' | 'reasoning' | 'perception')
  )

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    submit,
    cancel,
    latestResponse
  } = useAI({
    sessionId: sectionId,
    systemPrompt,
    providerId,
    onError: (error) => {
      console.error(`[BrainSimpleLayout:${sectionId}] Error:`, error)
    }
  })

  // Show save success feedback
  useEffect(() => {
    if (lastSaved && lastSaved.fileId === lastSavedId) {
      setShowSaveSuccess(true)
      const timer = setTimeout(() => {
        setShowSaveSuccess(false)
        dispatch(clearLastSaved())
        setLastSavedId(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [lastSaved, lastSavedId, dispatch])

  // Auto-scroll content to bottom when streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [latestResponse, isStreaming])

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    await submit(trimmed)
    setInputValue('')
  }, [inputValue, isLoading, submit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleCancel = useCallback(() => {
    cancel()
  }, [cancel])

  const handleSave = useCallback(async () => {
    // Only save if there are messages
    if (messages.length === 0) return

    // Generate title from first user message or use default
    const firstUserMessage = messages.find(m => m.role === 'user')
    const autoTitle = firstUserMessage
      ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'Untitled Conversation'

    // Convert messages to markdown format
    const markdownContent = messages.map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const timestamp = new Date(msg.timestamp).toISOString()
      return `## ${role} (${timestamp})\n\n${msg.content}\n`
    }).join('\n---\n\n')

    const saveInput: SaveBrainFileInput = {
      sectionId,
      content: markdownContent,
      metadata: {
        title: autoTitle,
        providerId,
        messageCount: messages.length,
        createdAt: messages[0]?.timestamp || Date.now(),
        updatedAt: Date.now()
      }
    }

    try {
      const result = await dispatch(saveBrainFile(saveInput)).unwrap()
      setLastSavedId(result.id)
      setActiveFileId(result.id)
      console.log(`[BrainSimpleLayout:${sectionId}] Saved conversation:`, result.id)

      // Refresh the files list
      await dispatch(loadBrainFiles())
    } catch (error) {
      console.error(`[BrainSimpleLayout:${sectionId}] Failed to save:`, error)
    }
  }, [messages, sectionId, providerId, dispatch])

  const handleFileSelect = useCallback(async (file: BrainFile) => {
    try {
      console.log(`[BrainSimpleLayout:${sectionId}] Loading conversation:`, file.id)

      // Load the full file content
      const loadedFile = await window.api.brainLoadOne({
        sectionId: file.sectionId,
        id: file.id
      })

      if (!loadedFile) {
        throw new Error('Failed to load conversation file')
      }

      setActiveFileId(file.id)
      setLoadedConversation(loadedFile)
    } catch (error) {
      console.error(`[BrainSimpleLayout:${sectionId}] Failed to load conversation:`, error)
      alert('Failed to load conversation. Please try again.')
    }
  }, [sectionId])

  // Get the latest assistant message for display
  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0]

  // Determine what content to show: streaming content OR completed message OR loaded conversation
  const displayContent = loadedConversation
    ? loadedConversation.content
    : isStreaming
      ? latestResponse
      : (latestAssistantMessage?.content || '')

  const isViewingLoadedConversation = loadedConversation !== null

  return (
    <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {isViewingLoadedConversation && loadedConversation && (
                <p className="text-xs text-muted-foreground mt-1">
                  Viewing: {loadedConversation.metadata.title || 'Untitled Conversation'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Conversation Selector Dropdown - Only show when there are saved conversations */}
            {files.length > 0 && (
              <AppDropdownMenu>
                <AppDropdownMenuTrigger asChild>
                  <AppButton
                    variant="outline"
                    size="sm"
                    className="shrink-0 min-w-[200px] justify-between"
                  >
                    <span className="truncate">
                      {loadedConversation
                        ? loadedConversation.metadata.title || 'Untitled Conversation'
                        : 'Select conversation...'}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </AppButton>
                </AppDropdownMenuTrigger>
                <AppDropdownMenuContent align="end" className="w-[300px]">
                  <div className="max-h-[400px] overflow-y-auto">
                    {files.map((file) => {
                      const isActive = file.id === activeFileId
                      const formattedDate = new Date(file.savedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })

                      return (
                        <AppDropdownMenuItem
                          key={file.id}
                          onClick={() => handleFileSelect(file)}
                          className="flex flex-col items-start gap-1 py-2"
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="truncate font-medium">
                              {file.metadata.title || 'Untitled Conversation'}
                            </span>
                            {isActive && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formattedDate}
                          </span>
                        </AppDropdownMenuItem>
                      )
                    })}
                  </div>
                </AppDropdownMenuContent>
              </AppDropdownMenu>
            )}

            {/* Save Button */}
              <AppButton
                onClick={handleSave}
                disabled={messages.length === 0 || isSaving}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {showSaveSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Saved
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </AppButton>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="mt-1 text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Display Area */}
        <div
          ref={contentRef}
          className="flex-1 overflow-auto p-6"
        >
          <div className="mx-auto max-w-4xl">
            {displayContent ? (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {displayContent}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Processing your request...' : 'Ask a question to get started.'}
                </p>
              </div>
            )}

            {isStreaming && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating response...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Section */}
          <div className="border-t border-border bg-background p-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                />

                {isLoading ? (
                  <AppButton
                    onClick={handleCancel}
                    variant="outline"
                    size="default"
                    className="shrink-0"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop
                  </AppButton>
                ) : (
                  <AppButton
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    size="default"
                    className="shrink-0"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit
                  </AppButton>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Press Enter to submit your question
              </p>
            </div>
          </div>
    </div>
  )
})

BrainSimpleLayout.displayName = 'BrainSimpleLayout'
