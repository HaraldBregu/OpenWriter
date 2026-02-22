import { useState, useCallback, useEffect, useRef } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface UseLlmChatOptions {
  sectionId: string
  systemPrompt?: string
  providerId?: string
  onError?: (error: Error) => void
}

export interface UseLlmChatReturn {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  submit: (prompt: string) => Promise<void>
  cancel: () => void
  clear: () => void
}

/**
 * Hook for managing LLM chat conversations in brain sections.
 * Integrates with the pipeline system for streaming responses.
 */
export function useLlmChat(options: UseLlmChatOptions): UseLlmChatReturn {
  const { sectionId, systemPrompt, providerId = 'openai', onError } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentRunIdRef = useRef<string | null>(null)
  const accumulatedContentRef = useRef<string>('')
  const assistantMessageIdRef = useRef<string | null>(null)

  // Listen for pipeline events (streaming tokens)
  useEffect(() => {
    console.log('[useLlmChat] Setting up pipeline event listener for section:', sectionId)

    const unsubscribe = window.api.onPipelineEvent((event) => {
      console.log('[useLlmChat] Received pipeline event:', event.type, event.data)

      if (event.type === 'token' && currentRunIdRef.current) {
        const data = event.data as { runId: string; token: string }

        if (data.runId === currentRunIdRef.current) {
          console.log('[useLlmChat] Token received:', data.token.substring(0, 20))
          setIsStreaming(true)
          accumulatedContentRef.current += data.token

          setMessages(prev => {
            const assistantMsgId = assistantMessageIdRef.current
            if (!assistantMsgId) {
              // Create new assistant message
              const newId = `msg-${Date.now()}`
              assistantMessageIdRef.current = newId
              console.log('[useLlmChat] Creating new assistant message:', newId)
              return [
                ...prev,
                {
                  id: newId,
                  role: 'assistant' as const,
                  content: accumulatedContentRef.current,
                  timestamp: Date.now()
                }
              ]
            }

            // Update existing assistant message
            return prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedContentRef.current }
                : msg
            )
          })
        }
      } else if (event.type === 'thinking') {
        console.log('[useLlmChat] Thinking event:', event.data)
      } else if (event.type === 'done') {
        const data = event.data as { runId: string }
        if (data.runId === currentRunIdRef.current) {
          console.log('[useLlmChat] Stream completed')
          setIsLoading(false)
          setIsStreaming(false)
          currentRunIdRef.current = null
          accumulatedContentRef.current = ''
          assistantMessageIdRef.current = null
        }
      } else if (event.type === 'error') {
        const data = event.data as { runId: string; message: string }
        if (data.runId === currentRunIdRef.current) {
          const errorMessage = data.message || 'An error occurred'
          console.error('[useLlmChat] Error event:', errorMessage)
          setError(errorMessage)
          setIsLoading(false)
          setIsStreaming(false)
          if (onError) {
            onError(new Error(errorMessage))
          }
          currentRunIdRef.current = null
          accumulatedContentRef.current = ''
          assistantMessageIdRef.current = null
        }
      }
    })

    return () => {
      console.log('[useLlmChat] Cleaning up pipeline event listener')
      unsubscribe()
    }
  }, [onError, sectionId])

  const submit = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return

    console.log('[useLlmChat] Submitting message:', { sectionId, providerId, systemPrompt })

    setError(null)
    setIsLoading(true)

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now()
    }

    // Prepare conversation history INCLUDING the new user message
    // Build this BEFORE state update to avoid race condition
    const conversationHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content
    }))

    setMessages(prev => [...prev, userMessage])

    try {
      console.log('[useLlmChat] Calling pipelineRun with:', {
        agent: 'chat',
        promptLength: prompt.trim().length,
        historyLength: conversationHistory.length,
        hasSystemPrompt: !!systemPrompt
      })

      // Use pipeline with ChatAgent for inference
      const result = await window.api.pipelineRun('chat', {
        prompt: prompt.trim(),
        context: {
          sectionId,
          providerId,
          messages: conversationHistory,
          systemPrompt
        }
      })

      console.log('[useLlmChat] Pipeline result:', result)

      if (result.success) {
        console.log('[useLlmChat] Run started with ID:', result.data.runId)
        currentRunIdRef.current = result.data.runId
        accumulatedContentRef.current = ''
        assistantMessageIdRef.current = null
      } else {
        console.error('[useLlmChat] Pipeline error:', result.error)
        throw new Error(result.error?.message || 'Failed to start inference')
      }
    } catch (err) {
      console.error('[useLlmChat] Submit error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsLoading(false)
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    }
  }, [isLoading, messages, sectionId, systemPrompt, providerId, onError])

  const cancel = useCallback(() => {
    if (currentRunIdRef.current) {
      window.api.pipelineCancel(currentRunIdRef.current)
      setIsLoading(false)
      setIsStreaming(false)
      currentRunIdRef.current = null
      accumulatedContentRef.current = ''
      assistantMessageIdRef.current = null
    }
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
    cancel()
  }, [cancel])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    submit,
    cancel,
    clear
  }
}
