import React from 'react'
import { AlertCircle } from 'lucide-react'
import { PersonalityChatMessages } from './PersonalityChatMessages'
import { PersonalityChatInput } from './PersonalityChatInput'
import { useLlmChat } from '@/hooks/useLlmChat'

export interface PersonalityChatContainerProps {
  sectionId: string
  systemPrompt?: string
  placeholder?: string
  emptyStateMessage?: string
  providerId?: string
}

export const PersonalityChatContainer: React.FC<PersonalityChatContainerProps> = React.memo(({
  sectionId,
  systemPrompt,
  placeholder,
  emptyStateMessage,
  providerId = 'openai'
}) => {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    submit,
    cancel
  } = useLlmChat({
    sectionId,
    systemPrompt,
    providerId,
    onError: (error) => {
      console.error(`[PersonalityChat:${sectionId}] Error:`, error)
    }
  })

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {error && (
        <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="mt-1 text-xs text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      <PersonalityChatMessages
        messages={messages}
        isStreaming={isStreaming}
        emptyStateMessage={emptyStateMessage}
      />

      <PersonalityChatInput
        onSubmit={submit}
        onCancel={cancel}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  )
})

PersonalityChatContainer.displayName = 'PersonalityChatContainer'
