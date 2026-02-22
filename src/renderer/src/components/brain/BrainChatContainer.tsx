import React from 'react'
import { BrainChatMessages } from './BrainChatMessages'
import { BrainChatInput } from './BrainChatInput'
import { useLlmChat } from '@/hooks/useLlmChat'

export interface BrainChatContainerProps {
  sectionId: string
  systemPrompt?: string
  placeholder?: string
  emptyStateMessage?: string
}

export const BrainChatContainer: React.FC<BrainChatContainerProps> = React.memo(({
  sectionId,
  systemPrompt,
  placeholder,
  emptyStateMessage
}) => {
  const {
    messages,
    isLoading,
    isStreaming,
    submit,
    cancel
  } = useLlmChat({
    sectionId,
    systemPrompt,
    onError: (error) => {
      console.error(`[BrainChat:${sectionId}] Error:`, error)
    }
  })

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <BrainChatMessages
        messages={messages}
        isStreaming={isStreaming}
        emptyStateMessage={emptyStateMessage}
      />

      <BrainChatInput
        onSubmit={submit}
        onCancel={cancel}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  )
})

BrainChatContainer.displayName = 'BrainChatContainer'
