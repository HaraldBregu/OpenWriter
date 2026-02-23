import React, { useEffect, useRef } from 'react'
import { User, Bot } from 'lucide-react'
import { MarkdownContent } from '@/components/MarkdownContent'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface PersonalityChatMessagesProps {
  messages: Message[]
  isStreaming?: boolean
  emptyStateMessage?: string
}

const MessageItem = React.memo<{ message: Message }>(({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={`max-w-[80%] rounded-lg p-4 ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card'
      }`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownContent content={message.content} />
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  )
})

MessageItem.displayName = 'MessageItem'

export const PersonalityChatMessages: React.FC<PersonalityChatMessagesProps> = React.memo(({
  messages,
  isStreaming = false,
  emptyStateMessage = 'Start a conversation by typing a message below.'
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {isStreaming && (
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 animate-pulse text-primary" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
})

PersonalityChatMessages.displayName = 'PersonalityChatMessages'
