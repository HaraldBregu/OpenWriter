// ---------------------------------------------------------------------------
// IEntityTaskService<TSubmitInput, TSubmitResult, TSaveOptions, TSaveResult>
//
// Generic abstraction over all Electron IPC calls that a domain-specific
// entity task context needs to perform.  Parameterising over:
//
//   TSubmitInput   — the request payload the service sends to the main process.
//   TSubmitResult  — the shape inside `data` when the IPC call succeeds.
//   TSaveOptions   — whatever the domain passes to its persistence call.
//   TSaveResult    — what the persistence call returns.
//
// Constraints:
//   - TSubmitResult must contain taskId so the context can register the task
//     in the shared TaskStore.
//   - TSaveResult must contain id so the context can surface lastSavedId.
//
// DIP: EntityTaskContext depends on this interface, not on any concrete class.
// Concrete implementations (Electron, mock, stub) are injected via providers.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IPC result envelope (mirrors the existing pattern in the personality service)
// ---------------------------------------------------------------------------

export interface EntityTaskSuccess<TData> {
  readonly success: true
  readonly data: TData
}

export interface EntityTaskFailure {
  readonly success: false
  readonly error: { readonly message: string; readonly code?: string }
}

export type EntityTaskIpcResult<TData> = EntityTaskSuccess<TData> | EntityTaskFailure

// ---------------------------------------------------------------------------
// Submit contract — every domain submit result must carry a taskId
// ---------------------------------------------------------------------------

export interface EntityTaskSubmitResult {
  readonly taskId: string
}

// ---------------------------------------------------------------------------
// Save contract — every domain save result must carry a persistent id
// ---------------------------------------------------------------------------

export interface EntityTaskSaveResult {
  readonly id: string
}

// ---------------------------------------------------------------------------
// Core service interface
// ---------------------------------------------------------------------------

/**
 * IEntityTaskService — the single boundary between a domain task context and
 * the outside world (Electron IPC, REST API, mock).
 *
 * @template TSubmitInput  Shape of data sent to the main process.
 * @template TSubmitResult Payload inside a successful IPC result (must extend EntityTaskSubmitResult).
 * @template TSaveOptions  Domain-specific options passed to the persistence method.
 * @template TSaveResult   Value returned by the persistence method (must extend EntityTaskSaveResult).
 *
 * Implementors only need to provide these four methods.  The context handles
 * all state management, event routing, and streaming internally.
 */
export interface IEntityTaskService<
  TSubmitInput,
  TSubmitResult extends EntityTaskSubmitResult,
  TSaveOptions,
  TSaveResult extends EntityTaskSaveResult,
> {
  /**
   * Submit a task to the main process. Returns a typed IPC result envelope so
   * the caller can distinguish success from failure without catching exceptions.
   */
  submitTask(input: TSubmitInput): Promise<EntityTaskIpcResult<TSubmitResult>>

  /**
   * Cancel a running task. Fire-and-forget: the authoritative state change
   * arrives via the TaskStore event listener.
   */
  cancelTask(taskId: string): void

  /**
   * Retrieve model settings for a provider. Used to resolve the concrete model
   * name at auto-save time when the user has not chosen one explicitly.
   * Returns null if the IPC call fails or no settings are stored.
   */
  getModelSettings(providerId: string): Promise<{ selectedModel?: string } | null>

  /**
   * Persist the entity data to disk (or any other store).
   * The context calls this automatically when a task completes successfully.
   */
  save(options: TSaveOptions): Promise<TSaveResult>
}
