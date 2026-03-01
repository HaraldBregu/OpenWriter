/**
 * TaskReactionHandler — interface for main-process side-effects triggered by task lifecycle events.
 *
 * Design principles:
 *  - ISP: all lifecycle callbacks are optional; handlers only implement what they need.
 *  - OCP: new task types are handled by adding new implementations, not modifying existing code.
 *  - SRP: each handler encapsulates side-effects for one task type (or wildcard '*').
 *
 * Usage:
 *   Register implementations with TaskReactionRegistry, then wire TaskReactionBus to EventBus.
 *   The reaction bus dispatches the right lifecycle method based on task type.
 *
 * Example — react to every 'demo' task that completes:
 *   class DemoTaskReaction implements TaskReactionHandler {
 *     readonly taskType = 'demo'
 *     onCompleted({ taskId }, result) {
 *       console.log('demo task done', taskId, result)
 *     }
 *   }
 *
 * Use taskType = '*' to react to all task types regardless of their type string.
 */

// ---------------------------------------------------------------------------
// Typed event payloads (mirrors AppEvents in EventBus, but strongly typed here)
// ---------------------------------------------------------------------------

export interface TaskSubmittedEvent {
  readonly taskId: string
  readonly taskType: string
  readonly input: unknown
  readonly priority: string
  readonly windowId?: number
}

export interface TaskStartedEvent {
  readonly taskId: string
  readonly taskType: string
  readonly windowId?: number
}

export interface TaskCompletedEvent {
  readonly taskId: string
  readonly taskType: string
  readonly result: unknown
  readonly durationMs: number
  readonly windowId?: number
}

export interface TaskFailedEvent {
  readonly taskId: string
  readonly taskType: string
  readonly error: string
  readonly code: string
  readonly windowId?: number
}

export interface TaskCancelledEvent {
  readonly taskId: string
  readonly taskType: string
  readonly windowId?: number
}

// ---------------------------------------------------------------------------
// Handler interface
// ---------------------------------------------------------------------------

export interface TaskReactionHandler {
  /**
   * The task type this handler reacts to.
   * Use '*' to subscribe to every task type.
   */
  readonly taskType: string

  /** Called when a task has been validated and added to the queue. */
  onSubmitted?(event: TaskSubmittedEvent): void | Promise<void>

  /** Called when a task slot becomes available and execution begins. */
  onStarted?(event: TaskStartedEvent): void | Promise<void>

  /** Called when a task finishes successfully. */
  onCompleted?(event: TaskCompletedEvent): void | Promise<void>

  /** Called when a task throws an unhandled (non-abort) error. */
  onFailed?(event: TaskFailedEvent): void | Promise<void>

  /** Called when a task is explicitly cancelled or aborted via timeout. */
  onCancelled?(event: TaskCancelledEvent): void | Promise<void>
}
