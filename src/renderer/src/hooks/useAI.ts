import { useState, useCallback, useEffect, useRef } from 'react'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface UseAIOptions {
  /** Unique identifier for this AI session */
  sessionId: string
  /** AI provider ID (e.g., 'openai', 'anthropic') */
  providerId?: string
  /** System prompt to guide AI behavior */
  systemPrompt?: string
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Callback when streaming starts */
  onStreamStart?: () => void
  /** Callback when streaming completes */
  onStreamComplete?: (response: string) => void
}

export interface UseAIReturn {
  /** Conversation messages */
  messages: AIMessage[]
  /** Whether AI is currently processing */
  isLoading: boolean
  /** Whether AI is currently streaming a response */
  isStreaming: boolean
  /** Current error message, if any */
  error: string | null
  /** Submit a prompt to the AI */
  submit: (prompt: string) => Promise<void>
  /** Cancel the current AI request */
  cancel: () => void
  /** Clear all messages and reset state */
  clear: () => void
  /** The latest AI response content */
  latestResponse: string
}

/**
 * useAI — unified hook for AI inference operations
 *
 * Handles AI chat conversations with streaming responses, message history,
 * and lifecycle management through the window.ai API.
 *
 * @example
 * ```tsx
 * const ai = useAI({
 *   sessionId: 'chat-123',
 *   providerId: 'openai',
 *   systemPrompt: 'You are a helpful assistant'
 * })
 *
 * // Submit a prompt
 * await ai.submit('Hello, how are you?')
 *
 * // Access the conversation
 * console.log(ai.messages)
 * console.log(ai.latestResponse)
 * ```
 */
export function useAI(options: UseAIOptions): UseAIReturn {
  const { sessionId, systemPrompt, providerId = 'openai', onError, onStreamStart, onStreamComplete } = options

  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestResponse, setLatestResponse] = useState<string>('')

  const currentRunIdRef = useRef<string | null>(null)
  const accumulatedContentRef = useRef<string>('')
  const assistantMessageIdRef = useRef<string | null>(null)

  // Listen for AI streaming events
  useEffect(() => {
    console.log('[useAI] Setting up AI event listener for session:', sessionId)

    const unsubscribe = window.ai.onEvent((event) => {
      console.log('[useAI] ======== EVENT RECEIVED ========')
      console.log('[useAI] Event type:', event.type)
      console.log('[useAI] Event data:', event.data)
      console.log('[useAI] Current runId:', currentRunIdRef.current)

      if (event.type === 'token') {
        const data = event.data as { runId: string; token: string }

        // If we receive a token but don't have a runId yet, set it
        // This handles the race condition where events arrive before the promise resolves
        if (!currentRunIdRef.current) {
          console.warn('[useAI] Token arrived before runId was set. Setting it now:', data.runId)
          currentRunIdRef.current = data.runId
          accumulatedContentRef.current = ''
          assistantMessageIdRef.current = null
        }

        if (data.runId === currentRunIdRef.current) {
          const isFirstToken = accumulatedContentRef.current.length === 0
          if (isFirstToken) {
            console.log('[useAI] ======== AI RESPONSE STARTING ========')
            setIsStreaming(true)
            onStreamStart?.()

            // Create assistant message placeholder only on first token
            const newId = `msg-${Date.now()}`
            assistantMessageIdRef.current = newId
            console.log('[useAI] Creating new assistant message:', newId)

            setMessages(prev => [
              ...prev,
              {
                id: newId,
                role: 'assistant' as const,
                content: '',
                timestamp: Date.now()
              }
            ])
          }

          console.log('[useAI] Token received:', JSON.stringify(data.token))
          accumulatedContentRef.current += data.token
          // Only update latestResponse during streaming - this triggers re-renders
          setLatestResponse(accumulatedContentRef.current)
        } else {
          console.warn('[useAI] Received token for different runId:', {
            received: data.runId,
            expected: currentRunIdRef.current
          })
        }
      } else if (event.type === 'thinking') {
        console.log('[useAI] Thinking event:', event.data)
      } else if (event.type === 'done') {
        const data = event.data as { runId: string }
        console.log('[useAI] Done event - runId:', data.runId, 'current:', currentRunIdRef.current)

        if (data.runId === currentRunIdRef.current) {
          console.log('[useAI] Stream completed')
          console.log('[useAI] ========================================')
          console.log('[useAI] COMPLETE AI RESPONSE:')
          console.log(accumulatedContentRef.current)
          console.log('[useAI] ========================================')
          console.log('[useAI] Response length:', accumulatedContentRef.current.length, 'characters')

          const finalResponse = accumulatedContentRef.current
          const assistantMsgId = assistantMessageIdRef.current

          // Update the assistant message with final content
          if (assistantMsgId) {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMsgId
                  ? { ...msg, content: finalResponse }
                  : msg
              )
            )
          }

          onStreamComplete?.(finalResponse)

          setIsLoading(false)
          setIsStreaming(false)
          currentRunIdRef.current = null
          accumulatedContentRef.current = ''
          assistantMessageIdRef.current = null
        }
      } else if (event.type === 'error') {
        const data = event.data as { runId: string; message: string }
        console.log('[useAI] Error event - runId:', data.runId, 'current:', currentRunIdRef.current)

        if (data.runId === currentRunIdRef.current) {
          const errorMessage = data.message || 'An error occurred'
          console.error('[useAI] Error event:', errorMessage)
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

      console.log('[useAI] ======== EVENT PROCESSED ========')
    })

    return () => {
      console.log('[useAI] Cleaning up AI event listener')
      unsubscribe()
    }
  }, [onError, onStreamStart, onStreamComplete, sessionId])

  const submit = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return

    console.log('[useAI] Submitting message:', { sessionId, providerId, systemPrompt })

    setError(null)
    setIsLoading(true)

    // Add user message
    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now()
    }

    // Prepare conversation history INCLUDING the new user message
    const conversationHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content
    }))

    setMessages(prev => [...prev, userMessage])

    try {
      console.log('[useAI] ======== SENDING REQUEST TO AI ========')
      console.log('[useAI] Session:', sessionId)
      console.log('[useAI] Provider:', providerId)
      console.log('[useAI] System Prompt:', systemPrompt)
      console.log('[useAI] Conversation History:')
      conversationHistory.forEach((msg, idx) => {
        console.log(`  [${idx}] ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
      })
      console.log('[useAI] Current User Message:', prompt.trim())
      console.log('[useAI] ======================================')

      // Use AI inference API
      const result = await window.ai.inference('chat', {
        prompt: prompt.trim(),
        context: {
          sessionId,
          providerId,
          messages: conversationHistory,
          systemPrompt
        }
      })

      console.log('[useAI] AI inference result:', result)

      if (result.success) {
        console.log('[useAI] Run started with ID:', result.data.runId)
        currentRunIdRef.current = result.data.runId
        accumulatedContentRef.current = ''
        assistantMessageIdRef.current = null
      } else {
        console.error('[useAI] AI inference error:', result.error)
        throw new Error(result.error?.message || 'Failed to start AI inference')
      }
    } catch (err) {
      console.error('[useAI] Submit error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsLoading(false)
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    }
  }, [isLoading, messages, sessionId, systemPrompt, providerId, onError])

  const cancel = useCallback(() => {
    if (currentRunIdRef.current) {
      window.ai.cancel(currentRunIdRef.current)
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
    setLatestResponse('')
    cancel()
  }, [cancel])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    submit,
    cancel,
    clear,
    latestResponse
  }
}
