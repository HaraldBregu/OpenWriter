import { useState, useCallback, useEffect, useRef } from 'react'
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationInput {
  prompt: string
  systemPrompt: string
  messages: { role: string; content: string }[]
  providerId: string
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
}

interface ConversationOutput {
  content: string
  tokenCount: number
}

export interface UseConversationTaskOptions {
  taskType: string
  systemPrompt?: string
  providerId?: string
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
  onComplete?: (messages: AIMessage[], finalContent: string) => void
}

export interface UseConversationTaskReturn {
  messages: AIMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  latestResponse: string
  submit: (prompt: string) => Promise<void>
  cancel: () => void
  clear: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useConversationTask — reusable hook for multi-turn AI conversations.
 *
 * Manages a local `messages` array and delegates task submission/streaming
 * to the shared TaskStore via `useTaskSubmit`. Extracts the generic
 * conversation pattern (message accumulation, first-token detection,
 * streaming, completion) so it can be reused by any chat-like feature.
 *
 * Does NOT handle persistence (save/load) — that stays domain-specific.
 */
export function useConversationTask({
  taskType,
  systemPrompt = '',
  providerId = 'openai',
  modelId,
  temperature,
  maxTokens,
  onComplete,
}: UseConversationTaskOptions): UseConversationTaskReturn {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestResponse, setLatestResponse] = useState('')

  // Track whether we've seen the first token for the current task.
  const firstTokenSeenRef = useRef(false)
  // Track last applied streamedContent length.
  const lastStreamLengthRef = useRef(0)
  // Stable ref for onComplete to avoid stale closures.
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  // Stable ref for messages to avoid stale closures in effects.
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const emptyInput: ConversationInput = {
    prompt: '',
    systemPrompt: '',
    messages: [],
    providerId,
  }

  const {
    submit: taskSubmit,
    cancel: taskCancel,
    status,
    streamedContent,
    result,
    error: taskError,
    reset,
  } = useTaskSubmit<ConversationInput, ConversationOutput>(taskType, emptyInput)

  // ---------------------------------------------------------------------------
  // Stream tokens → latestResponse, first-token detection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isLoading) return
    if (streamedContent.length <= lastStreamLengthRef.current) return

    const newTokens = streamedContent.slice(lastStreamLengthRef.current)
    lastStreamLengthRef.current = streamedContent.length

    if (!firstTokenSeenRef.current) {
      firstTokenSeenRef.current = true
      // Append an empty assistant message placeholder
      const assistantMsg: AIMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsStreaming(true)
      setLatestResponse(newTokens)
    } else {
      setLatestResponse((prev) => prev + newTokens)
    }
  }, [streamedContent, isLoading])

  // ---------------------------------------------------------------------------
  // React to task lifecycle transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isLoading) return

    if (status === 'completed') {
      const finalContent = (result as ConversationOutput | null)?.content || latestResponse

      setMessages((prev) => {
        const updated = prev.map((msg, idx) =>
          idx === prev.length - 1 && msg.role === 'assistant'
            ? { ...msg, content: finalContent }
            : msg
        )
        // Fire onComplete with the finalized messages
        onCompleteRef.current?.(updated, finalContent)
        return updated
      })

      setIsLoading(false)
      setIsStreaming(false)
      firstTokenSeenRef.current = false
      lastStreamLengthRef.current = 0
      reset()
    } else if (status === 'error') {
      setError(taskError || 'An error occurred')
      setIsLoading(false)
      setIsStreaming(false)
      firstTokenSeenRef.current = false
      lastStreamLengthRef.current = 0
      reset()
    } else if (status === 'cancelled') {
      setIsLoading(false)
      setIsStreaming(false)
      firstTokenSeenRef.current = false
      lastStreamLengthRef.current = 0
      reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoading, taskError, reset])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const submit = useCallback(async (prompt: string): Promise<void> => {
    const trimmed = prompt.trim()
    if (!trimmed || isLoading) return

    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }

    const updatedMessages = [...messagesRef.current, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsStreaming(false)
    setError(null)
    setLatestResponse('')
    firstTokenSeenRef.current = false
    lastStreamLengthRef.current = 0

    const conversationHistory = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    await taskSubmit({
      prompt: trimmed,
      systemPrompt,
      messages: conversationHistory,
      providerId,
      modelId,
      temperature,
      maxTokens,
    })
  }, [isLoading, taskSubmit, systemPrompt, providerId, modelId, temperature, maxTokens])

  const cancel = useCallback(() => {
    taskCancel()
    setIsLoading(false)
    setIsStreaming(false)
  }, [taskCancel])

  const clear = useCallback(() => {
    setMessages([])
    setIsLoading(false)
    setIsStreaming(false)
    setError(null)
    setLatestResponse('')
    firstTokenSeenRef.current = false
    lastStreamLengthRef.current = 0
    reset()
  }, [reset])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    latestResponse,
    submit,
    cancel,
    clear,
  }
}
