import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Send, StopCircle, AlertCircle, Loader2 } from 'lucide-react'
import { AppButton } from '@/components/app/AppButton'
import { useAI } from '@/hooks/useAI'

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
  const contentRef = useRef<HTMLDivElement>(null)

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

  // Get the latest assistant message for display
  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0]

  // Determine what content to show: streaming content OR completed message
  const displayContent = isStreaming ? latestResponse : (latestAssistantMessage?.content || '')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        {icon}
        <h1 className="text-xl font-semibold">{title}</h1>
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
