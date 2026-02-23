import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { AIMessage } from '@/hooks/useAI'
import { loadPersonalityFiles } from '@/store/personalityFilesSlice'
import { useAppDispatch } from '@/store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskState {
  messages: AIMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  latestResponse: string
  runId: string | null
  isSaving: boolean
  lastSaveError: string | null
  providerId: string
  modelId: string | null
}

interface SubmitTaskOptions {
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
}

interface PersonalityTaskContextValue {
  getTaskState: (sectionId: string) => TaskState
  submitTask: (sectionId: string, prompt: string, systemPrompt: string, providerId: string, options?: SubmitTaskOptions) => Promise<void>
  cancelTask: (sectionId: string) => void
  /** Internal version counter -- hooks subscribe to this to trigger re-renders */
  version: number
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TASK_STATE: TaskState = {
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  latestResponse: '',
  runId: null,
  isSaving: false,
  lastSaveError: null,
  providerId: 'openai',
  modelId: null
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PersonalityTaskContext = createContext<PersonalityTaskContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PersonalityTaskProviderProps {
  children: React.ReactNode
}

function PersonalityTaskProvider({ children }: PersonalityTaskProviderProps): React.JSX.Element {
  // Mutable map holding per-section task state. We use a ref so that the
  // event listener closure always sees the latest data without needing to
  // re-subscribe on every state change.
  const taskMapRef = useRef<Map<string, TaskState>>(new Map())

  // Maps runId -> sectionId so streaming events can be routed to the
  // correct task even though the event payload only carries runId.
  const runIdToSectionRef = useRef<Map<string, string>>(new Map())

  // Version counter -- bumped whenever task state changes so that consuming
  // hooks re-render. This is intentionally a simple counter rather than
  // spreading full state objects, keeping re-renders cheap.
  const [version, setVersion] = useState(0)
  const bumpVersion = useCallback(() => setVersion((v) => v + 1), [])

  const dispatch = useAppDispatch()

  // Stable reference for dispatch so the event listener doesn't go stale
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Get or create a TaskState entry for the given sectionId. */
  const getOrCreate = useCallback((sectionId: string): TaskState => {
    const existing = taskMapRef.current.get(sectionId)
    if (existing) return existing
    const fresh: TaskState = { ...DEFAULT_TASK_STATE }
    taskMapRef.current.set(sectionId, fresh)
    return fresh
  }, [])

  /** Immutably update a task in the map and bump the version counter. */
  const updateTask = useCallback(
    (sectionId: string, patch: Partial<TaskState>) => {
      const prev = getOrCreate(sectionId)
      const next: TaskState = { ...prev, ...patch }
      taskMapRef.current.set(sectionId, next)
      bumpVersion()
    },
    [getOrCreate, bumpVersion]
  )

  // -----------------------------------------------------------------------
  // Auto-save helper (called when a task completes)
  // -----------------------------------------------------------------------

  const autoSave = useCallback(async (sectionId: string, task: TaskState) => {
    if (task.messages.length === 0) return

    updateTask(sectionId, { isSaving: true, lastSaveError: null })

    try {
      // Resolve model name: prefer explicit modelId from task, then fall back to store
      let modelName = task.modelId || 'unknown'
      if (modelName === 'unknown') {
        try {
          const settings = await window.api.storeGetModelSettings(task.providerId)
          modelName = settings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
        } catch {
          modelName = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
        }
      }

      // Get the last assistant response as content
      const lastAssistant = [...task.messages].reverse().find((m) => m.role === 'assistant')
      const markdownContent = lastAssistant?.content || ''

      // Save via IPC directly (not through Redux)
      await window.api.personalitySave({
        sectionId,
        content: markdownContent,
        metadata: {
          title: sectionId,
          provider: task.providerId,
          model: modelName
        }
      })

      updateTask(sectionId, { isSaving: false })

      // Refresh Redux file list so the sidebar / dropdowns pick up the new file
      dispatchRef.current(loadPersonalityFiles())

      console.log(`[PersonalityTask] Auto-saved conversation for ${sectionId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-save failed'
      console.error(`[PersonalityTask] Auto-save error for ${sectionId}:`, message)
      updateTask(sectionId, { isSaving: false, lastSaveError: message })
    }
  }, [updateTask])

  // -----------------------------------------------------------------------
  // Global event listener (single listener for all personality sections)
  // -----------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = window.ai.onEvent((event) => {
      const { type, data } = event as {
        type: 'token' | 'thinking' | 'done' | 'error'
        data: Record<string, unknown>
      }

      const runId = data?.runId as string | undefined
      if (!runId) return

      const sectionId = runIdToSectionRef.current.get(runId)
      if (!sectionId) return // Event belongs to a different consumer (e.g. useAI)

      const task = taskMapRef.current.get(sectionId)
      if (!task) return

      if (type === 'token') {
        const token = (data as { token: string }).token
        const isFirstToken = task.latestResponse.length === 0 && !task.isStreaming

        if (isFirstToken) {
          // Create assistant message placeholder on first token
          const assistantMsg: AIMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: Date.now()
          }
          const newLatest = token
          const newMessages = [...task.messages, assistantMsg]
          updateTask(sectionId, {
            messages: newMessages,
            isStreaming: true,
            latestResponse: newLatest
          })
        } else {
          const newLatest = task.latestResponse + token
          updateTask(sectionId, { latestResponse: newLatest })
        }
      } else if (type === 'done') {
        const finalContent = task.latestResponse
        // Update the last assistant message with final content
        const updatedMessages = task.messages.map((msg, idx) =>
          idx === task.messages.length - 1 && msg.role === 'assistant'
            ? { ...msg, content: finalContent }
            : msg
        )

        const completedTask: TaskState = {
          ...task,
          messages: updatedMessages,
          isLoading: false,
          isStreaming: false,
          runId: null
        }
        taskMapRef.current.set(sectionId, completedTask)
        bumpVersion()

        // Clean up runId mapping
        runIdToSectionRef.current.delete(runId)

        console.log(`[PersonalityTask] Task completed for ${sectionId}`)

        // Auto-save the completed conversation
        autoSave(sectionId, completedTask)
      } else if (type === 'error') {
        const errorMessage = (data as { message?: string }).message || 'An error occurred'
        console.error(`[PersonalityTask] Error for ${sectionId}:`, errorMessage)

        updateTask(sectionId, {
          error: errorMessage,
          isLoading: false,
          isStreaming: false,
          runId: null
        })

        // Clean up runId mapping
        runIdToSectionRef.current.delete(runId)
      }
      // 'thinking' events are intentionally ignored (no UI for them in personality pages)
    })

    return () => {
      unsubscribe()
    }
  }, [updateTask, bumpVersion, autoSave])

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const getTaskState = useCallback(
    (sectionId: string): TaskState => {
      return getOrCreate(sectionId)
    },
    [getOrCreate]
  )

  const submitTask = useCallback(
    async (sectionId: string, prompt: string, systemPrompt: string, providerId: string, options?: SubmitTaskOptions) => {
      const trimmed = prompt.trim()
      if (!trimmed) return

      const task = getOrCreate(sectionId)
      if (task.isLoading) return

      // Create user message
      const userMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now()
      }

      const updatedMessages = [...task.messages, userMessage]
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content
      }))

      updateTask(sectionId, {
        messages: updatedMessages,
        isLoading: true,
        isStreaming: false,
        error: null,
        latestResponse: '',
        providerId,
        modelId: options?.modelId ?? null
      })

      try {
        const result = await window.ai.inference('chat', {
          prompt: trimmed,
          context: {
            sessionId: sectionId,
            providerId,
            messages: conversationHistory,
            systemPrompt,
            ...(options?.modelId ? { modelId: options.modelId } : {}),
            ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
            ...(options?.maxTokens ? { maxTokens: options.maxTokens } : {})
          }
        })

        if (result.success) {
          const runId = result.data.runId
          runIdToSectionRef.current.set(runId, sectionId)
          updateTask(sectionId, { runId })
          console.log(`[PersonalityTask] Started task for ${sectionId}, runId: ${runId}`)
        } else {
          const errorMsg = result.error?.message || 'Failed to start AI inference'
          updateTask(sectionId, {
            error: errorMsg,
            isLoading: false
          })
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
        updateTask(sectionId, {
          error: errorMsg,
          isLoading: false
        })
      }
    },
    [getOrCreate, updateTask]
  )

  const cancelTask = useCallback(
    (sectionId: string) => {
      const task = taskMapRef.current.get(sectionId)
      if (!task?.runId) return

      window.ai.cancel(task.runId)

      // Clean up the runId mapping
      runIdToSectionRef.current.delete(task.runId)

      updateTask(sectionId, {
        isLoading: false,
        isStreaming: false,
        runId: null
      })
    },
    [updateTask]
  )

  // Memoize the context value -- only the version counter changes identity
  // when state updates, which is exactly what consuming hooks key off.
  const contextValue: PersonalityTaskContextValue = React.useMemo(
    () => ({ getTaskState, submitTask, cancelTask, version }),
    [getTaskState, submitTask, cancelTask, version]
  )

  return (
    <PersonalityTaskContext.Provider value={contextValue}>
      {children}
    </PersonalityTaskContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePersonalityTask -- consumes the PersonalityTaskContext and returns
 * task state + actions scoped to a single personality section.
 *
 * The hook re-renders whenever any task's state changes (via the version
 * counter). This is acceptable because personality pages are leaf
 * components and the version bump is O(1).
 *
 * @param sectionId  - The personality section (e.g. "consciousness")
 * @param systemPrompt - Optional system prompt passed through to inference
 * @param providerId - Optional AI provider id (defaults to "openai")
 */
interface UsePersonalityTaskOptions {
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
}

function usePersonalityTask(
  sectionId: string,
  systemPrompt?: string,
  providerId?: string,
  options?: UsePersonalityTaskOptions
): {
  messages: AIMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  latestResponse: string
  submit: (prompt: string) => Promise<void>
  cancel: () => void
  isSaving: boolean
  lastSaveError: string | null
} {
  const ctx = useContext(PersonalityTaskContext)
  if (ctx === undefined) {
    throw new Error('usePersonalityTask must be used within a PersonalityTaskProvider')
  }

  const { getTaskState, submitTask, cancelTask, version: _version } = ctx

  // Read current state for this section (re-evaluated on every version bump)
  const task = getTaskState(sectionId)

  const submit = useCallback(
    (prompt: string) => submitTask(sectionId, prompt, systemPrompt || '', providerId || 'openai', {
      modelId: options?.modelId,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    }),
    [sectionId, systemPrompt, providerId, options?.modelId, options?.temperature, options?.maxTokens, submitTask]
  )

  const cancel = useCallback(() => cancelTask(sectionId), [sectionId, cancelTask])

  return {
    messages: task.messages,
    isLoading: task.isLoading,
    isStreaming: task.isStreaming,
    error: task.error,
    latestResponse: task.latestResponse,
    submit,
    cancel,
    isSaving: task.isSaving,
    lastSaveError: task.lastSaveError
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { PersonalityTaskProvider, usePersonalityTask, PersonalityTaskContext }
export type { TaskState, PersonalityTaskContextValue }
