import React, { useState, useRef, useCallback, useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, StopCircle, AlertCircle, Loader2, Check, ChevronDown, Settings2, Plus } from 'lucide-react'
import { AppButton } from '@/components/app/AppButton'
import {
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuTrigger
} from '@/components/app'
import { usePersonalityTask } from '@/contexts/PersonalityTaskContext'
import { useAppSelector, useAppDispatch } from '@/store'
import { selectPersonalityFilesBySection, loadPersonalityFiles } from '@/store/personalityFilesSlice'
import type { PersonalityFile } from '@/store/personalityFilesSlice'
import { PersonalitySettingsPanel, DEFAULT_INFERENCE_SETTINGS } from './PersonalitySettingsSheet'
import type { InferenceSettings } from './PersonalitySettingsSheet'
import { getDefaultModelId } from '@/config/aiProviders'

export interface PersonalitySimpleLayoutProps {
  sectionId: string
  systemPrompt?: string
  placeholder?: string
  providerId?: string
  icon: React.ReactNode
  title: string
  examplePrompt?: string
}

export const PersonalitySimpleLayout: React.FC<PersonalitySimpleLayoutProps> = React.memo(({
  sectionId,
  systemPrompt,
  placeholder = 'Ask a question...',
  providerId = 'openai',
  icon,
  title,
  examplePrompt
}) => {
  const [inputValue, setInputValue] = useState('')
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [loadedConversation, setLoadedConversation] = useState<PersonalityFile | null>(null)
  // When true the user has explicitly requested a blank slate; the auto-load
  // effect must not immediately reload the most recent file over the top.
  const [isNewMode, setIsNewMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [inferenceSettings, setInferenceSettings] = useState<InferenceSettings>(() => ({
    ...DEFAULT_INFERENCE_SETTINGS,
    providerId: providerId || 'openai',
    modelId: getDefaultModelId(providerId || 'openai')
  }))
  // Section-level defaults loaded from disk (null = not loaded yet or absent)
  const [sectionDefaults, setSectionDefaults] = useState<InferenceSettings | null>(null)
  const dispatch = useAppDispatch()
  const contentRef = useRef<HTMLDivElement>(null)
  const saveSectionConfigTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get files for this section for the dropdown
  const files = useAppSelector(
    selectPersonalityFilesBySection(sectionId as 'emotional-depth' | 'consciousness' | 'motivation' | 'moral-intuition' | 'irrationality' | 'growth' | 'social-identity' | 'creativity' | 'mortality' | 'contradiction')
  )

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    submit,
    cancel,
    clear,
    latestResponse,
    isSaving,
    lastSaveError,
    lastSavedFileId
  } = usePersonalityTask(sectionId, systemPrompt, inferenceSettings.providerId, {
    modelId: inferenceSettings.modelId,
    temperature: inferenceSettings.temperature,
    maxTokens: inferenceSettings.maxTokens,
    reasoning: inferenceSettings.reasoning
  })

  // Load section config on mount — use it as initial inference settings
  useEffect(() => {
    let cancelled = false
    window.personality.loadSectionConfig({ sectionId }).then((config) => {
      if (cancelled || !config) return
      const defaults: InferenceSettings = {
        providerId: config.provider,
        modelId: config.model,
        temperature: typeof config.temperature === 'number' ? config.temperature : DEFAULT_INFERENCE_SETTINGS.temperature,
        maxTokens: config.maxTokens !== undefined ? config.maxTokens : DEFAULT_INFERENCE_SETTINGS.maxTokens,
        reasoning: typeof config.reasoning === 'boolean' ? config.reasoning : DEFAULT_INFERENCE_SETTINGS.reasoning
      }
      setSectionDefaults(defaults)
      // Only apply to current settings if no conversation is loaded yet
      // (avoid overwriting settings restored from a loaded conversation)
      if (!loadedConversation) {
        setInferenceSettings(defaults)
      }
    }).catch((err) => {
      console.warn(`[PersonalitySimpleLayout:${sectionId}] Failed to load section config:`, err)
    })
    return () => { cancelled = true }
  }, [sectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // User-initiated settings change: update React state immediately, debounce
  // the disk write so slider drags don't spam IPC calls.
  const handleUserSettingsChange = useCallback((next: InferenceSettings) => {
    setInferenceSettings(next)

    if (saveSectionConfigTimer.current) {
      clearTimeout(saveSectionConfigTimer.current)
    }
    saveSectionConfigTimer.current = setTimeout(() => {
      window.personality.saveSectionConfig({
        sectionId,
        update: {
          provider: next.providerId,
          model: next.modelId,
          temperature: next.temperature,
          maxTokens: next.maxTokens,
          reasoning: next.reasoning
        }
      }).then((config) => {
        setSectionDefaults({
          providerId: config.provider,
          modelId: config.model,
          temperature: typeof config.temperature === 'number' ? config.temperature : DEFAULT_INFERENCE_SETTINGS.temperature,
          maxTokens: config.maxTokens !== undefined ? config.maxTokens : DEFAULT_INFERENCE_SETTINGS.maxTokens,
          reasoning: typeof config.reasoning === 'boolean' ? config.reasoning : DEFAULT_INFERENCE_SETTINGS.reasoning
        })
      }).catch((err) => {
        console.warn(`[PersonalitySimpleLayout:${sectionId}] Failed to save section config:`, err)
      })
    }, 500)
  }, [sectionId])

  // Clean up the debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveSectionConfigTimer.current) {
        clearTimeout(saveSectionConfigTimer.current)
      }
    }
  }, [])

  // Auto-scroll content to bottom when streaming
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [latestResponse, isStreaming])

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    // Clear loaded conversation to show live task and exit new-mode sentinel
    setLoadedConversation(null)
    setActiveFileId(null)
    setIsNewMode(false)

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

  const handleCreateNew = useCallback(() => {
    // Reset context task state so messages / streaming state are wiped
    clear()
    // Clear loaded-file display and block the auto-load effect
    setLoadedConversation(null)
    setActiveFileId(null)
    setIsNewMode(true)
    setInputValue('')
    // Restore section config defaults (or app defaults if no section config)
    setInferenceSettings(sectionDefaults ?? {
      ...DEFAULT_INFERENCE_SETTINGS,
      providerId: providerId || 'openai',
      modelId: getDefaultModelId(providerId || 'openai')
    })
  }, [clear, sectionDefaults, providerId])

  const handleFileSelect = useCallback(async (file: PersonalityFile) => {
    try {
      console.log(`[PersonalitySimpleLayout:${sectionId}] Loading conversation:`, file.id)

      // Load the full file content
      const loadedFile = await window.personality.loadOne({
        sectionId: file.sectionId,
        id: file.id
      })

      if (!loadedFile) {
        // File was deleted externally — refresh list and clear stale state
        console.warn(`[PersonalitySimpleLayout:${sectionId}] File not found, refreshing list:`, file.id)
        setActiveFileId(null)
        setLoadedConversation(null)
        dispatch(loadPersonalityFiles())
        return
      }

      setActiveFileId(file.id)
      setLoadedConversation(loadedFile)

      // Restore inference settings from the conversation's saved metadata so
      // the sidebar reflects the exact config that was used when it was written.
      const meta = loadedFile.metadata
      setInferenceSettings({
        providerId: meta.provider,
        modelId: meta.model,
        temperature: typeof meta.temperature === 'number' ? meta.temperature : DEFAULT_INFERENCE_SETTINGS.temperature,
        maxTokens: meta.maxTokens !== undefined ? (meta.maxTokens as number | null) : DEFAULT_INFERENCE_SETTINGS.maxTokens,
        reasoning: typeof meta.reasoning === 'boolean' ? meta.reasoning : DEFAULT_INFERENCE_SETTINGS.reasoning
      })
    } catch (error) {
      // Network/IPC error — still recover gracefully
      console.error(`[PersonalitySimpleLayout:${sectionId}] Failed to load conversation:`, error)
      setActiveFileId(null)
      setLoadedConversation(null)
      dispatch(loadPersonalityFiles())
    }
  }, [sectionId, dispatch])

  // Auto-load the most recent file on mount, and re-fire after stale state is cleared.
  // Blocked while a task is loading/streaming/saving so submit doesn't re-trigger a
  // file load before the newly created file appears in the list.
  // Also blocked when the user has explicitly requested a new blank conversation (isNewMode),
  // or when a specific file is pending selection via lastSavedFileId.
  useEffect(() => {
    if (files.length > 0 && !loadedConversation && !activeFileId && !isLoading && !isStreaming && !isNewMode && !isSaving && !lastSavedFileId) {
      const mostRecent = [...files].sort((a, b) => b.savedAt - a.savedAt)[0]
      handleFileSelect(mostRecent)
    }
  }, [files, loadedConversation, activeFileId, isLoading, isStreaming, isNewMode, isSaving, lastSavedFileId]) // eslint-disable-line react-hooks/exhaustive-deps

  // After auto-save completes, select the newly created file once it appears in the Redux list.
  useEffect(() => {
    if (!lastSavedFileId || files.length === 0) return
    const savedFile = files.find(f => f.id === lastSavedFileId)
    if (savedFile) {
      handleFileSelect(savedFile)
    }
  }, [lastSavedFileId, files]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear stale state when the active file is no longer in the files list (was deleted)
  useEffect(() => {
    if (activeFileId && !files.find(f => f.id === activeFileId)) {
      setLoadedConversation(null)
      setActiveFileId(null)
    }
  }, [files, activeFileId])

  // Get the latest assistant message for display
  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0]

  // Determine what content to show: streaming always wins, then loaded file, then last completed message
  const displayContent = isStreaming
    ? latestResponse
    : loadedConversation
      ? loadedConversation.content
      : (latestAssistantMessage?.content || '')

  return (
    <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {icon}
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Conversation Selector Dropdown - Only show when there are saved conversations */}
            {files.length > 0 && (
              <AppDropdownMenu>
                <AppDropdownMenuTrigger asChild>
                  <AppButton
                    variant="outline"
                    size="sm"
                    className="shrink-0 min-w-[140px] justify-between"
                  >
                    <span className="truncate">
                      {loadedConversation
                        ? new Date(loadedConversation.savedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Version'}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </AppButton>
                </AppDropdownMenuTrigger>
                <AppDropdownMenuContent align="end" className="w-[300px]">
                  <div className="max-h-[400px] overflow-y-auto">
                    {files.map((file) => {
                      const isActive = file.id === activeFileId
                      const formattedDateTime = new Date(file.savedAt).toLocaleDateString('en-US', {
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
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <span className="truncate text-sm">
                            {formattedDateTime}
                          </span>
                          {isActive && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </AppDropdownMenuItem>
                      )
                    })}
                  </div>
                </AppDropdownMenuContent>
              </AppDropdownMenu>
            )}

            {/* Create New conversation button */}
            <AppButton
              variant="outline"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={handleCreateNew}
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </AppButton>

            {/* Settings Gear Toggle */}
            <AppButton
              variant={showSettings ? 'default' : 'outline'}
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={() => setShowSettings((v) => !v)}
            >
              <Settings2 className="h-4 w-4" />
            </AppButton>

            {/* Auto-save status */}
            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {lastSaveError && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>Save failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Body: main content + optional settings sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content column */}
          <div className="flex flex-1 flex-col overflow-hidden">
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
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Markdown remarkPlugins={[remarkGfm]}>{displayContent}</Markdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[300px] items-center justify-center">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground">Processing your request...</p>
                    ) : examplePrompt ? (
                      <button
                        type="button"
                        onClick={() => { setInputValue(examplePrompt) }}
                        className="max-w-lg rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1">Try this</p>
                        <p className="text-sm text-foreground">{examplePrompt}</p>
                      </button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ask a question to get started.</p>
                    )}
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

            {/* Input Section — hidden when viewing a saved version */}
            {!loadedConversation && (
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
            )}
          </div>

          {/* Inline settings sidebar */}
          {showSettings && (
            <PersonalitySettingsPanel
              settings={inferenceSettings}
              onSettingsChange={handleUserSettingsChange}
            />
          )}
        </div>
    </div>
  )
})

PersonalitySimpleLayout.displayName = 'PersonalitySimpleLayout'
