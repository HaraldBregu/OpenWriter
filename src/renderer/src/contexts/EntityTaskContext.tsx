/**
 * EntityTaskContext — generic, domain-agnostic context for per-entity
 * streaming AI chat tasks.
 *
 * Design goals:
 *  1. Zero re-renders in the provider — all state lives in a hand-rolled
 *     external store that React reads via useSyncExternalStore.
 *  2. Surgical re-renders per entity — a stream token for entity-A does not
 *     cause entity-B to re-render, even if both are mounted simultaneously.
 *  3. One size fits all domains — Personality, Writing, Document, etc. each
 *     become a thin createEntityTaskContext() call with domain-specific types.
 *  4. Testable — inject a mock service via the provider's `service` prop.
 *
 * Usage pattern (e.g. for the Personality domain):
 *
 *   // 1. Define domain types
 *   type PersonalitySubmitInput = { ... }
 *   type PersonalitySubmitResult = { taskId: string }
 *   type PersonalitySaveOptions  = { sectionId: string; content: string; ... }
 *   type PersonalitySaveResult   = { id: string }
 *
 *   // 2. Create the context bundle
 *   export const {
 *     Provider: PersonalityTaskProvider,
 *     useEntityTask: usePersonalityTask,
 *   } = createEntityTaskContext<
 *     PersonalitySubmitInput,
 *     PersonalitySubmitResult,
 *     PersonalitySaveOptions,
 *     PersonalitySaveResult
 *   >({
 *     displayName: 'PersonalityTask',
 *     defaultProviderId: 'openai',
 *     buildSaveOptions: (entityId, state, content) => ({ sectionId: entityId, content, ... }),
 *     onSaveSuccess: (entityId, result, dispatch) => { dispatch(loadPersonalityFiles()) },
 *   })
 *
 *   // 3. In App.tsx — single provider, no nesting
 *   <PersonalityTaskProvider service={electronPersonalityTaskService}>
 *     {children}
 *   </PersonalityTaskProvider>
 *
 *   // 4. In a component
 *   const { messages, isStreaming, submit, cancel } = usePersonalityTask(sectionId, systemPrompt, providerId)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { AppDispatch } from '@/store'
import { useAppDispatch } from '@/store'
import { useTaskContext } from '@/contexts/TaskContext'
import type {
  IEntityTaskService,
  EntityTaskSubmitResult,
  EntityTaskSaveResult,
} from '@/services/IEntityTaskService'

// ---------------------------------------------------------------------------
// Public state shape — what a consuming hook receives per entity
// ---------------------------------------------------------------------------

/**
 * EntityChatMessage — generic message in a conversational task exchange.
 * Domains can augment this via intersection if they need extra fields.
 */
export interface EntityChatMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly timestamp: number
}

/**
 * InferenceOptions — the subset of model parameters that can be overridden
 * per-submit call.  Mirrors the existing SubmitTaskOptions pattern.
 */
export interface InferenceOptions {
  readonly modelId?: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
  readonly reasoning?: boolean
}

/**
 * EntityTaskState<TSaveResult> — full per-entity state snapshot.
 * TSaveResult is the domain's persistence result type (must carry an `id`).
 */
export interface EntityTaskState<TSaveResult extends EntityTaskSaveResult> {
  readonly messages: EntityChatMessage[]
  readonly isLoading: boolean
  readonly isStreaming: boolean
  readonly error: string | null
  readonly latestResponse: string
  /** The IPC task ID, present only while a task is in flight. */
  readonly taskId: string | null
  readonly isSaving: boolean
  readonly lastSaveError: string | null
  readonly lastSaved: TSaveResult | null
  /** Runtime inference settings, set on each submit call. */
  readonly providerId: string
  readonly modelId: string | null
  readonly temperature?: number
  readonly maxTokens?: number | null
  readonly reasoning?: boolean
}

// ---------------------------------------------------------------------------
// useEntityTask return type
// ---------------------------------------------------------------------------

/**
 * UseEntityTaskReturn — what the hook hands back to the consuming component.
 */
export interface UseEntityTaskReturn<TSaveResult extends EntityTaskSaveResult> {
  readonly messages: EntityChatMessage[]
  readonly isLoading: boolean
  readonly isStreaming: boolean
  readonly error: string | null
  readonly latestResponse: string
  readonly isSaving: boolean
  readonly lastSaveError: string | null
  readonly lastSaved: TSaveResult | null
  /** Submit a prompt for this entity. */
  readonly submit: (prompt: string) => Promise<void>
  /** Cancel the active task. No-op if none running. */
  readonly cancel: () => void
  /** Reset entity state back to the initial empty state. */
  readonly clear: () => void
}

// ---------------------------------------------------------------------------
// ITaskCompletionHandler — optional hook point for post-completion side effects
// ---------------------------------------------------------------------------

/**
 * ITaskCompletionHandler — called after the task completes and (optionally)
 * after the auto-save finishes. Lets the domain dispatch Redux actions, trigger
 * navigation, or update sibling state without coupling the context to Redux.
 *
 * @template TSaveResult The domain's save result type.
 */
export interface ITaskCompletionHandler<TSaveResult extends EntityTaskSaveResult> {
  /**
   * Called when the AI task completes successfully, before auto-save.
   * Return false to suppress auto-save for this completion.
   */
  onComplete?: (entityId: string, finalContent: string, dispatch: AppDispatch) => boolean | void

  /**
   * Called after a successful auto-save.
   */
  onSaved?: (entityId: string, result: TSaveResult, dispatch: AppDispatch) => void

  /**
   * Called when auto-save fails. Return true to suppress the default error
   * state update (i.e. the domain handles it).
   */
  onSaveError?: (entityId: string, error: Error, dispatch: AppDispatch) => boolean | void
}

// ---------------------------------------------------------------------------
// createEntityTaskContext options
// ---------------------------------------------------------------------------

/**
 * EntityTaskContextConfig — everything createEntityTaskContext needs to know
 * about the domain in order to produce a working context + hook.
 *
 * @template TSubmitInput  The payload sent to IEntityTaskService.submitTask().
 * @template TSubmitResult The success data from the IPC submit call.
 * @template TSaveOptions  The argument shape for IEntityTaskService.save().
 * @template TSaveResult   The value returned by IEntityTaskService.save().
 */
export interface EntityTaskContextConfig<
  TSubmitInput,
  _TSubmitResult extends EntityTaskSubmitResult,
  TSaveOptions,
  TSaveResult extends EntityTaskSaveResult,
> {
  /**
   * Used in error messages and React DevTools labels.
   * e.g. 'PersonalityTask', 'WritingTask'
   */
  displayName: string

  /**
   * Fallback providerId used when the hook caller omits it.
   */
  defaultProviderId?: string

  /**
   * Map from the hook's (entityId, state, content, options) to the domain's
   * TSubmitInput shape so the service receives the right payload.
   */
  buildSubmitInput: (
    entityId: string,
    prompt: string,
    systemPrompt: string,
    state: Readonly<EntityTaskState<TSaveResult>>,
    options: InferenceOptions,
  ) => TSubmitInput

  /**
   * The task type string forwarded to the shared TaskStore (e.g. 'ai-chat').
   * Must match what the main process registers as a task handler.
   */
  taskType?: string

  /**
   * Extract the final content string from the completed task's result payload.
   * Defaults to `result?.content ?? ''` if omitted.
   */
  extractResultContent?: (result: unknown) => string

  /**
   * Build the domain-specific save options from the entity context.
   * Called automatically when a task completes successfully (if provided).
   * Omit this entirely if the domain has no auto-save requirement.
   */
  buildSaveOptions?: (
    entityId: string,
    state: Readonly<EntityTaskState<TSaveResult>>,
    finalContent: string,
  ) => TSaveOptions | null

  /**
   * Optional post-completion and post-save callbacks.
   * Use these to dispatch Redux actions or trigger side effects.
   */
  completionHandler?: ITaskCompletionHandler<TSaveResult>
}

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

/**
 * EntityTaskStore<TSaveResult> — a hand-rolled external store that holds all
 * mutable per-entity task state. Designed to be consumed via useSyncExternalStore.
 *
 * Subscription model:
 *   - Keys are entityIds.
 *   - update(entityId, patch) notifies only the listeners for that entityId.
 *   - Cross-entity re-renders are impossible by design.
 */
interface EntityTaskStore<TSaveResult extends EntityTaskSaveResult> {
  getSnapshot: (entityId: string) => EntityTaskState<TSaveResult>
  subscribe: (entityId: string, listener: () => void) => () => void
  update: (entityId: string, patch: Partial<EntityTaskState<TSaveResult>>) => void
  getOrCreate: (entityId: string) => EntityTaskState<TSaveResult>
  reset: (entityId: string, defaults: Partial<EntityTaskState<TSaveResult>>) => void
}

function buildDefaultState<TSaveResult extends EntityTaskSaveResult>(
  defaultProviderId: string,
): EntityTaskState<TSaveResult> {
  return {
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    latestResponse: '',
    taskId: null,
    isSaving: false,
    lastSaveError: null,
    lastSaved: null,
    providerId: defaultProviderId,
    modelId: null,
    temperature: undefined,
    maxTokens: undefined,
    reasoning: undefined,
  }
}

function createEntityTaskStore<TSaveResult extends EntityTaskSaveResult>(
  defaultProviderId: string,
): EntityTaskStore<TSaveResult> {
  const entityMap = new Map<string, EntityTaskState<TSaveResult>>()
  const listeners = new Map<string, Set<() => void>>()

  function getOrCreate(entityId: string): EntityTaskState<TSaveResult> {
    const existing = entityMap.get(entityId)
    if (existing) return existing
    const fresh = buildDefaultState<TSaveResult>(defaultProviderId)
    entityMap.set(entityId, fresh)
    return fresh
  }

  function getSnapshot(entityId: string): EntityTaskState<TSaveResult> {
    return getOrCreate(entityId)
  }

  function subscribe(entityId: string, listener: () => void): () => void {
    let set = listeners.get(entityId)
    if (!set) {
      set = new Set()
      listeners.set(entityId, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) listeners.delete(entityId)
    }
  }

  function update(entityId: string, patch: Partial<EntityTaskState<TSaveResult>>): void {
    const prev = getOrCreate(entityId)
    const next = { ...prev, ...patch }
    entityMap.set(entityId, next)
    listeners.get(entityId)?.forEach((fn) => fn())
  }

  function reset(entityId: string, defaults: Partial<EntityTaskState<TSaveResult>>): void {
    const fresh: EntityTaskState<TSaveResult> = {
      ...buildDefaultState<TSaveResult>(defaultProviderId),
      ...defaults,
    }
    entityMap.set(entityId, fresh)
    listeners.get(entityId)?.forEach((fn) => fn())
  }

  return { getSnapshot, subscribe, update, getOrCreate, reset }
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface EntityTaskContextValue<
  TSubmitInput,
  TSubmitResult extends EntityTaskSubmitResult,
  TSaveOptions,
  TSaveResult extends EntityTaskSaveResult,
> {
  store: EntityTaskStore<TSaveResult>
  submitTask: (
    entityId: string,
    prompt: string,
    systemPrompt: string,
    providerId: string,
    options?: InferenceOptions,
  ) => Promise<void>
  cancelTask: (entityId: string) => void
  clearTask: (entityId: string) => void
  // Kept for internal use only — not surfaced by the hook
  _service: IEntityTaskService<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult>
}

// ---------------------------------------------------------------------------
// createEntityTaskContext — the public factory
// ---------------------------------------------------------------------------

/**
 * createEntityTaskContext — produces a typed {Provider, useEntityTask} pair
 * for a given domain. Call this once at module level, not inside a component.
 *
 * The returned Provider must be placed in the component tree INSIDE <TaskProvider>.
 */
export function createEntityTaskContext<
  TSubmitInput,
  TSubmitResult extends EntityTaskSubmitResult,
  TSaveOptions,
  TSaveResult extends EntityTaskSaveResult,
>(
  config: EntityTaskContextConfig<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult>,
): {
  Provider: React.FC<{
    children: React.ReactNode
    service: IEntityTaskService<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult>
  }>
  useEntityTask: (
    entityId: string,
    systemPrompt?: string,
    providerId?: string,
    options?: InferenceOptions,
  ) => UseEntityTaskReturn<TSaveResult>
  Context: React.Context<
    EntityTaskContextValue<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult> | undefined
  >
} {
  const {
    displayName,
    defaultProviderId = 'openai',
    buildSubmitInput,
    taskType = 'ai-chat',
    extractResultContent = (result: unknown) =>
      (result as { content?: string } | null)?.content ?? '',
    buildSaveOptions,
    completionHandler,
  } = config

  // ---------------------------------------------------------------------------
  // React context
  // ---------------------------------------------------------------------------

  const Context = createContext<
    EntityTaskContextValue<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult> | undefined
  >(undefined)
  Context.displayName = `${displayName}Context`

  // ---------------------------------------------------------------------------
  // Provider
  // ---------------------------------------------------------------------------

  function Provider({
    children,
    service,
  }: {
    children: React.ReactNode
    service: IEntityTaskService<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult>
  }): React.JSX.Element {
    // The store is created once — its reference never changes.
    const storeRef = useRef<EntityTaskStore<TSaveResult> | null>(null)
    if (!storeRef.current) {
      storeRef.current = createEntityTaskStore<TSaveResult>(defaultProviderId)
    }
    const store = storeRef.current

    // Access the shared TaskStore from the parent <TaskProvider>.
    const { store: sharedStore } = useTaskContext()

    // Maps taskId → entityId for event routing.
    const taskIdToEntityRef = useRef<Map<string, string>>(new Map())

    // Stable ref to the service so autoSave closures don't go stale.
    const serviceRef = useRef(service)
    serviceRef.current = service

    const dispatch = useAppDispatch()
    const dispatchRef = useRef<AppDispatch>(dispatch)
    dispatchRef.current = dispatch

    // -----------------------------------------------------------------------
    // Auto-save
    // -----------------------------------------------------------------------

    const autoSave = useCallback(
      async (entityId: string, state: EntityTaskState<TSaveResult>, content: string): Promise<void> => {
        if (!buildSaveOptions) return
        if (!content) {
          console.warn(`[${displayName}] Skipping auto-save for "${entityId}": empty content`)
          return
        }

        // Allow the completion handler to suppress auto-save.
        if (completionHandler?.onComplete) {
          const suppress = completionHandler.onComplete(entityId, content, dispatchRef.current)
          if (suppress === false) return
        }

        const saveOptions = buildSaveOptions(entityId, state, content)
        if (!saveOptions) return

        // Resolve the model name lazily if the user left it as null.
        // (This is a best-effort lookup; failures are non-fatal.)
        store.update(entityId, { isSaving: true, lastSaveError: null })

        try {
          const result = await serviceRef.current.save(saveOptions)
          store.update(entityId, { isSaving: false, lastSaved: result })

          if (completionHandler?.onSaved) {
            completionHandler.onSaved(entityId, result, dispatchRef.current)
          }

          console.log(`[${displayName}] Auto-saved for "${entityId}":`, result.id)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          console.error(`[${displayName}] Auto-save error for "${entityId}":`, error.message)

          const suppressed = completionHandler?.onSaveError?.(entityId, error, dispatchRef.current)
          if (!suppressed) {
            store.update(entityId, { isSaving: false, lastSaveError: error.message })
          }
        }
      },
      // store and displayName are stable; completionHandler and buildSaveOptions
      // are config-level constants — safe to omit from deps.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [store],
    )

    // -----------------------------------------------------------------------
    // Route shared TaskStore events → per-entity state
    // -----------------------------------------------------------------------

    useEffect(() => {
      const unsub = sharedStore.subscribe('ALL', () => {
        for (const [taskId, entityId] of taskIdToEntityRef.current.entries()) {
          const snap = sharedStore.getTaskSnapshot(taskId)
          if (!snap) continue

          const entityState = store.getSnapshot(entityId)

          // --- Streaming tokens ---
          if (
            snap.streamedContent &&
            snap.streamedContent.length > entityState.latestResponse.length
          ) {
            const newContent = snap.streamedContent
            const isFirstToken = entityState.latestResponse.length === 0 && !entityState.isStreaming

            if (isFirstToken) {
              const assistantMsg: EntityChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
              }
              store.update(entityId, {
                messages: [...entityState.messages, assistantMsg],
                isStreaming: true,
                latestResponse: newContent,
              })
            } else {
              store.update(entityId, { latestResponse: newContent })
            }
          }

          // --- Terminal states ---
          if (snap.status === 'completed') {
            const finalContent =
              extractResultContent(snap.result) || store.getSnapshot(entityId).latestResponse

            const currentState = store.getSnapshot(entityId)
            const updatedMessages = currentState.messages.map((msg, idx) =>
              idx === currentState.messages.length - 1 &&
              msg.role === 'assistant' &&
              !msg.content
                ? { ...msg, content: finalContent }
                : msg,
            )

            const completedState: EntityTaskState<TSaveResult> = {
              ...currentState,
              messages: updatedMessages,
              isLoading: false,
              isStreaming: false,
              taskId: null,
            }

            store.update(entityId, completedState)
            taskIdToEntityRef.current.delete(taskId)

            console.log(`[${displayName}] Task completed for "${entityId}"`)
            autoSave(entityId, completedState, finalContent)
          } else if (snap.status === 'error') {
            console.error(`[${displayName}] Task error for "${entityId}":`, snap.error)
            store.update(entityId, {
              error: snap.error ?? 'An error occurred',
              isLoading: false,
              isStreaming: false,
              taskId: null,
            })
            taskIdToEntityRef.current.delete(taskId)
          } else if (snap.status === 'cancelled') {
            console.log(`[${displayName}] Task cancelled for "${entityId}"`)
            store.update(entityId, {
              isLoading: false,
              isStreaming: false,
              taskId: null,
            })
            taskIdToEntityRef.current.delete(taskId)
          }
        }
      })

      return () => unsub()
    }, [sharedStore, store, autoSave])

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    const submitTask = useCallback(
      async (
        entityId: string,
        prompt: string,
        systemPrompt: string,
        providerId: string,
        options?: InferenceOptions,
      ): Promise<void> => {
        const trimmed = prompt.trim()
        if (!trimmed) return

        const entityState = store.getOrCreate(entityId)
        if (entityState.isLoading) return

        const userMsg: EntityChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmed,
          timestamp: Date.now(),
        }

        const updatedMessages = [...entityState.messages, userMsg]
        const pendingState: Partial<EntityTaskState<TSaveResult>> = {
          messages: updatedMessages,
          isLoading: true,
          isStreaming: false,
          error: null,
          latestResponse: '',
          providerId,
          modelId: options?.modelId ?? null,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
          reasoning: options?.reasoning,
        }
        store.update(entityId, pendingState)

        const currentState = store.getSnapshot(entityId)
        const submitInput = buildSubmitInput(entityId, trimmed, systemPrompt, currentState, options ?? {})

        try {
          const ipcResult = await serviceRef.current.submitTask(submitInput)

          if (ipcResult.success) {
            const { taskId } = ipcResult.data
            taskIdToEntityRef.current.set(taskId, entityId)
            sharedStore.addTask(taskId, taskType, 'normal')
            store.update(entityId, { taskId })
            console.log(`[${displayName}] Started task for "${entityId}", taskId: ${taskId}`)
          } else {
            store.update(entityId, {
              error: ipcResult.error.message,
              isLoading: false,
            })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to start task'
          store.update(entityId, { error: message, isLoading: false })
        }
      },
      [store, sharedStore, buildSubmitInput, taskType],
    )

    const cancelTask = useCallback(
      (entityId: string): void => {
        const entityState = store.getSnapshot(entityId)
        if (!entityState.taskId) return
        serviceRef.current.cancelTask(entityState.taskId)
        taskIdToEntityRef.current.delete(entityState.taskId)
        store.update(entityId, { isLoading: false, isStreaming: false, taskId: null })
      },
      [store],
    )

    const clearTask = useCallback(
      (entityId: string): void => {
        store.reset(entityId, {})
      },
      [store],
    )

    // Context value is stable — the store ref and useCallbacks with [store] deps
    // all resolve to the same references for the lifetime of the provider.
    const contextValueRef = useRef<
      EntityTaskContextValue<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult>
    >({
      store,
      submitTask,
      cancelTask,
      clearTask,
      _service: service,
    })
    // Patch mutable function slots defensively (future-proofing).
    contextValueRef.current.submitTask = submitTask
    contextValueRef.current.cancelTask = cancelTask
    contextValueRef.current.clearTask = clearTask

    return <Context.Provider value={contextValueRef.current}>{children}</Context.Provider>
  }

  Provider.displayName = `${displayName}Provider`

  // ---------------------------------------------------------------------------
  // useEntityTask — the hook returned alongside the Provider
  // ---------------------------------------------------------------------------

  function useEntityTask(
    entityId: string,
    systemPrompt?: string,
    providerId?: string,
    options?: InferenceOptions,
  ): UseEntityTaskReturn<TSaveResult> {
    const ctx = useContext(Context)
    if (ctx === undefined) {
      throw new Error(
        `use${displayName} must be used within a <${displayName}Provider>. ` +
          `Ensure the provider wraps the component tree that calls this hook.`,
      )
    }

    const { store, submitTask, cancelTask, clearTask } = ctx

    // Surgical subscription — only this entityId's listeners fire on update.
    const entityState = useSyncExternalStore(
      useCallback((listener) => store.subscribe(entityId, listener), [store, entityId]),
      useCallback(() => store.getSnapshot(entityId), [store, entityId]),
    )

    // Stable bound actions — only re-created when entityId changes, which is
    // the correct behaviour (we want to target the new entity).
    const resolvedProviderId = providerId ?? defaultProviderId

    const submit = useCallback(
      (prompt: string): Promise<void> =>
        submitTask(entityId, prompt, systemPrompt ?? '', resolvedProviderId, options),
      // Spread individual option fields to avoid object identity churn causing
      // needless re-creation of this callback on every render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        entityId,
        systemPrompt,
        resolvedProviderId,
        options?.modelId,
        options?.temperature,
        options?.maxTokens,
        options?.reasoning,
        submitTask,
      ],
    )

    const cancel = useCallback(() => cancelTask(entityId), [entityId, cancelTask])
    const clear = useCallback(() => clearTask(entityId), [entityId, clearTask])

    return {
      messages: entityState.messages,
      isLoading: entityState.isLoading,
      isStreaming: entityState.isStreaming,
      error: entityState.error,
      latestResponse: entityState.latestResponse,
      isSaving: entityState.isSaving,
      lastSaveError: entityState.lastSaveError,
      lastSaved: entityState.lastSaved,
      submit,
      cancel,
      clear,
    }
  }

  return { Provider, useEntityTask, Context }
}
