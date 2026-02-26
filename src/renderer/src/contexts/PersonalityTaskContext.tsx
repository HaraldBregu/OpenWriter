import React, { createContext, useContext, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { loadPersonalityFiles } from '@/store/personalityFilesSlice'
import { useAppDispatch } from '@/store'
import type { IPersonalityTaskService } from '@/services/IPersonalityTaskService'
import { electronPersonalityTaskService } from '@/services/ElectronPersonalityTaskService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskState {
  messages: AIMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  latestResponse: string
  taskId: string | null
  isSaving: boolean
  lastSaveError: string | null
  lastSavedFileId: string | null
  providerId: string
  modelId: string | null
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
}

interface SubmitTaskOptions {
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
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
  taskId: null,
  isSaving: false,
  lastSaveError: null,
  lastSavedFileId: null,
  providerId: 'openai',
  modelId: null,
  temperature: undefined,
  maxTokens: undefined,
  reasoning: undefined
}

// ---------------------------------------------------------------------------
// Store — lives outside React, holds all mutable task state.
//
// The design is a hand-rolled external store compatible with useSyncExternalStore:
//   - `taskMap`       : Map<sectionId, TaskState> — the source of truth
//   - `listeners`     : Map<sectionId, Set<() => void>> — per-section subscriber sets
//   - `subscribe(id)` : returns an unsubscribe function for a given section
//   - `getSnapshot(id)`: returns the current TaskState for a section (stable ref when unchanged)
//   - `update(id, patch)`: immutably patches a section's state and notifies only its listeners
//
// This means a stream token for "consciousness" only wakes up the hook subscribed
// to "consciousness", not the other 9 personality sections that may be mounted.
// ---------------------------------------------------------------------------

interface PersonalityTaskStore {
  getSnapshot: (sectionId: string) => TaskState
  subscribe: (sectionId: string, listener: () => void) => () => void
  update: (sectionId: string, patch: Partial<TaskState>) => void
  getOrCreate: (sectionId: string) => TaskState
}

function createPersonalityTaskStore(): PersonalityTaskStore {
  const taskMap = new Map<string, TaskState>()
  const listeners = new Map<string, Set<() => void>>()

  function getOrCreate(sectionId: string): TaskState {
    const existing = taskMap.get(sectionId)
    if (existing) return existing
    const fresh: TaskState = { ...DEFAULT_TASK_STATE }
    taskMap.set(sectionId, fresh)
    return fresh
  }

  function getSnapshot(sectionId: string): TaskState {
    return getOrCreate(sectionId)
  }

  function subscribe(sectionId: string, listener: () => void): () => void {
    let set = listeners.get(sectionId)
    if (!set) {
      set = new Set()
      listeners.set(sectionId, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) listeners.delete(sectionId)
    }
  }

  function update(sectionId: string, patch: Partial<TaskState>): void {
    const prev = getOrCreate(sectionId)
    const next: TaskState = { ...prev, ...patch }
    taskMap.set(sectionId, next)
    // Notify only the listeners subscribed to this specific section
    listeners.get(sectionId)?.forEach((fn) => fn())
  }

  return { getSnapshot, subscribe, update, getOrCreate }
}

// ---------------------------------------------------------------------------
// Context — holds the stable store reference and action dispatchers.
// The store object never changes identity so the context value is always
// the same reference: zero provider re-renders from task updates.
// ---------------------------------------------------------------------------

interface PersonalityTaskContextValue {
  store: PersonalityTaskStore
  submitTask: (sectionId: string, prompt: string, systemPrompt: string, providerId: string, options?: SubmitTaskOptions) => Promise<void>
  cancelTask: (sectionId: string) => void
  clearTask: (sectionId: string) => void
}

const PersonalityTaskContext = createContext<PersonalityTaskContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PersonalityTaskProviderProps {
  children: React.ReactNode
  /**
   * Injectable service for IPC communication. Defaults to the production
   * Electron implementation. Pass a MockPersonalityTaskService in tests.
   */
  service?: IPersonalityTaskService
}

function PersonalityTaskProvider({ children, service = electronPersonalityTaskService }: PersonalityTaskProviderProps): React.JSX.Element {
  // The store is created once per provider mount and never changes.
  const storeRef = useRef<PersonalityTaskStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createPersonalityTaskStore()
  }
  const store = storeRef.current

  // Maps taskId -> sectionId so streaming events can be routed correctly.
  const taskIdToSectionRef = useRef<Map<string, string>>(new Map())

  const dispatch = useAppDispatch()
  // Stable reference for dispatch so the event listener doesn't go stale.
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  // -----------------------------------------------------------------------
  // Auto-save helper (called when a task completes)
  // -----------------------------------------------------------------------

  const autoSave = useCallback(async (sectionId: string, task: TaskState, content?: string) => {
    if (task.messages.length === 0) return

    const markdownContent = content || (() => {
      const lastAssistant = [...task.messages].reverse().find((m) => m.role === 'assistant')
      return lastAssistant?.content || ''
    })()

    if (!markdownContent) {
      console.warn(`[PersonalityTask] Skipping auto-save for ${sectionId}: empty content`)
      return
    }

    store.update(sectionId, { isSaving: true, lastSaveError: null })

    try {
      let modelName = task.modelId || 'unknown'
      if (modelName === 'unknown') {
        const settings = await service.getModelSettings(task.providerId)
        modelName = settings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
      }

      const saveResult = await service.savePersonality({
        sectionId,
        content: markdownContent,
        metadata: {
          title: sectionId,
          provider: task.providerId,
          model: modelName,
          temperature: task.temperature,
          maxTokens: task.maxTokens,
          reasoning: task.reasoning
        }
      })

      store.update(sectionId, { isSaving: false, lastSavedFileId: saveResult.id })
      dispatchRef.current(loadPersonalityFiles())

      console.log(`[PersonalityTask] Auto-saved conversation for ${sectionId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-save failed'
      console.error(`[PersonalityTask] Auto-save error for ${sectionId}:`, message)
      store.update(sectionId, { isSaving: false, lastSaveError: message })
    }
  }, [store, service])

  // -----------------------------------------------------------------------
  // Global IPC event listener
  // -----------------------------------------------------------------------

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = service.onTaskEvent((event) => {
      const { type, data } = event

      const taskId = data?.taskId as string | undefined
      if (!taskId) return

      const sectionId = taskIdToSectionRef.current.get(taskId)
      if (!sectionId) return

      const task = store.getSnapshot(sectionId)

      if (type === 'stream') {
        const token = data.token as string
        if (!token) return

        const isFirstToken = task.latestResponse.length === 0 && !task.isStreaming

        if (isFirstToken) {
          const assistantMsg: AIMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: Date.now()
          }
          store.update(sectionId, {
            messages: [...task.messages, assistantMsg],
            isStreaming: true,
            latestResponse: token
          })
        } else {
          store.update(sectionId, { latestResponse: task.latestResponse + token })
        }
      } else if (type === 'completed') {
        const result = data.result as { content: string; tokenCount: number } | undefined
        const finalContent = result?.content || task.latestResponse

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
          taskId: null
        }
        // Write the completed state directly then notify
        store.update(sectionId, completedTask)

        taskIdToSectionRef.current.delete(taskId)

        console.log(`[PersonalityTask] Task completed for ${sectionId}`)
        autoSave(sectionId, completedTask, finalContent)
      } else if (type === 'error') {
        const errorMessage = (data as { message?: string }).message || 'An error occurred'
        console.error(`[PersonalityTask] Error for ${sectionId}:`, errorMessage)

        store.update(sectionId, {
          error: errorMessage,
          isLoading: false,
          isStreaming: false,
          taskId: null
        })

        taskIdToSectionRef.current.delete(taskId)
      } else if (type === 'cancelled') {
        console.log(`[PersonalityTask] Task cancelled for ${sectionId}`)

        store.update(sectionId, {
          isLoading: false,
          isStreaming: false,
          taskId: null
        })

        taskIdToSectionRef.current.delete(taskId)
      }
    })
    } catch (err) {
      console.error('[PersonalityTaskProvider] Failed to register task event listener:', err)
    }

    return () => unsubscribe?.()
  }, [store, autoSave, service])

  // -----------------------------------------------------------------------
  // Action callbacks — stable across renders because store never changes.
  // -----------------------------------------------------------------------

  const submitTask = useCallback(
    async (sectionId: string, prompt: string, systemPrompt: string, providerId: string, options?: SubmitTaskOptions) => {
      const trimmed = prompt.trim()
      if (!trimmed) return

      const task = store.getOrCreate(sectionId)
      if (task.isLoading) return

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

      store.update(sectionId, {
        messages: updatedMessages,
        isLoading: true,
        isStreaming: false,
        error: null,
        latestResponse: '',
        providerId,
        modelId: options?.modelId ?? null,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        reasoning: options?.reasoning
      })

      try {
        const result = await service.submitTask({
          prompt: trimmed,
          providerId,
          systemPrompt,
          messages: conversationHistory,
          modelId: options?.modelId,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        })

        if (result.success) {
          const taskId = result.data.taskId
          taskIdToSectionRef.current.set(taskId, sectionId)
          store.update(sectionId, { taskId })
          console.log(`[PersonalityTask] Started task for ${sectionId}, taskId: ${taskId}`)
        } else {
          const errorMsg = result.error?.message || 'Failed to start AI task'
          store.update(sectionId, { error: errorMsg, isLoading: false })
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
        store.update(sectionId, { error: errorMsg, isLoading: false })
      }
    },
    [store, service]
  )

  const cancelTask = useCallback(
    (sectionId: string) => {
      const task = store.getSnapshot(sectionId)
      if (!task.taskId) return

      service.cancelTask(task.taskId)
      taskIdToSectionRef.current.delete(task.taskId)

      store.update(sectionId, {
        isLoading: false,
        isStreaming: false,
        taskId: null
      })
    },
    [store, service]
  )

  const clearTask = useCallback(
    (sectionId: string) => {
      store.update(sectionId, { ...DEFAULT_TASK_STATE })
    },
    [store]
  )

  // Context value is created once — store, submitTask, cancelTask, clearTask
  // are all stable references that never change after mount.
  const contextValue = useRef<PersonalityTaskContextValue>({
    store,
    submitTask,
    cancelTask,
    clearTask,
  })
  // Keep action refs current in case useCallback ever produces a new identity
  // (won't happen given stable [store] deps, but defensive).
  contextValue.current.submitTask = submitTask
  contextValue.current.cancelTask = cancelTask
  contextValue.current.clearTask = clearTask

  return (
    <PersonalityTaskContext.Provider value={contextValue.current}>
      {children}
    </PersonalityTaskContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePersonalityTask — subscribes to a single personality section's task state.
 *
 * Uses `useSyncExternalStore` so that:
 *   - Only the component that called `usePersonalityTask(sectionId)` re-renders
 *     when that section's state changes.
 *   - Stream tokens for "consciousness" do NOT cause "motivation" to re-render,
 *     even if both are mounted simultaneously.
 *   - The provider component itself never re-renders due to task state changes.
 */
interface UsePersonalityTaskOptions {
  modelId?: string | null
  temperature?: number
  maxTokens?: number | null
  reasoning?: boolean
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
  clear: () => void
  isSaving: boolean
  lastSaveError: string | null
  lastSavedFileId: string | null
} {
  const ctx = useContext(PersonalityTaskContext)
  if (ctx === undefined) {
    throw new Error('usePersonalityTask must be used within a PersonalityTaskProvider')
  }

  const { store, submitTask, cancelTask, clearTask } = ctx

  // Subscribe to only this section — useSyncExternalStore calls the subscribe
  // function with a stable listener and will re-render only when that listener
  // is notified (i.e. when store.update(sectionId, ...) is called).
  //
  // The subscribe and getSnapshot callbacks are re-created when sectionId changes,
  // which is the correct behaviour — we want to switch subscriptions.
  const task = useSyncExternalStore(
    useCallback((listener) => store.subscribe(sectionId, listener), [store, sectionId]),
    useCallback(() => store.getSnapshot(sectionId), [store, sectionId])
  )

  const submit = useCallback(
    (prompt: string) => submitTask(sectionId, prompt, systemPrompt || '', providerId || 'openai', {
      modelId: options?.modelId,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      reasoning: options?.reasoning
    }),
    [sectionId, systemPrompt, providerId, options?.modelId, options?.temperature, options?.maxTokens, options?.reasoning, submitTask]
  )

  const cancel = useCallback(() => cancelTask(sectionId), [sectionId, cancelTask])
  const clear = useCallback(() => clearTask(sectionId), [sectionId, clearTask])

  return {
    messages: task.messages,
    isLoading: task.isLoading,
    isStreaming: task.isStreaming,
    error: task.error,
    latestResponse: task.latestResponse,
    submit,
    cancel,
    clear,
    isSaving: task.isSaving,
    lastSaveError: task.lastSaveError,
    lastSavedFileId: task.lastSavedFileId
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { PersonalityTaskProvider, usePersonalityTask, PersonalityTaskContext }
export type { TaskState, PersonalityTaskContextValue }
