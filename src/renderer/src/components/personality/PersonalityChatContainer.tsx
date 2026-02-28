import React from 'react'

export interface PersonalityChatContainerProps {
  sectionId: string
  systemPrompt?: string
  placeholder?: string
  emptyStateMessage?: string
  providerId?: string
}

export const PersonalityChatContainer: React.FC<PersonalityChatContainerProps> = React.memo(() => {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Chat functionality is not available.</p>
      </div>
    </div>
  )
})

PersonalityChatContainer.displayName = 'PersonalityChatContainer'
