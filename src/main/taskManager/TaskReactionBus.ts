/**
 * TaskReactionBus — subscribes to main-process task lifecycle AppEvents and
 * fan-outs to all registered TaskReactionHandlers for the matching task type.
 *
 * Pattern: Observer (EventBus subscription) + Registry dispatch.
 *
 * Lifecycle:
 *   1. Instantiate with EventBus + TaskReactionRegistry.
 *   2. Call initialize() once after bootstrap (registers EventBus listeners).
 *   3. Call destroy() on app shutdown (unsubscribes all listeners).
 *
 * Error isolation:
 *   Each handler call is wrapped in a try/catch so a crashing handler never
 *   blocks other handlers or the task system itself.
 */

import type { Disposable } from '../core/ServiceContainer'
import type { EventBus, AppEvent } from '../core/EventBus'
import type { TaskReactionRegistry } from './TaskReactionRegistry'
import type {
  TaskReactionHandler,
  TaskSubmittedEvent,
  TaskStartedEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
  TaskCancelledEvent,
} from './TaskReactionHandler'

export class TaskReactionBus implements Disposable {
  private readonly unsubs: Array<() => void> = []

  constructor(
    private readonly registry: TaskReactionRegistry,
    private readonly eventBus: EventBus,
  ) {}

  /** Wire up all EventBus subscriptions. Call once after bootstrap. */
  initialize(): void {
    this.unsubs.push(
      this.eventBus.on('task:submitted', (e) =>
        this.dispatch(e, (h, p) => h.onSubmitted?.(p as TaskSubmittedEvent)),
      ),
      this.eventBus.on('task:started', (e) =>
        this.dispatch(e, (h, p) => h.onStarted?.(p as TaskStartedEvent)),
      ),
      this.eventBus.on('task:completed', (e) =>
        this.dispatch(e, (h, p) => h.onCompleted?.(p as TaskCompletedEvent)),
      ),
      this.eventBus.on('task:failed', (e) =>
        this.dispatch(e, (h, p) => h.onFailed?.(p as TaskFailedEvent)),
      ),
      this.eventBus.on('task:cancelled', (e) =>
        this.dispatch(e, (h, p) => h.onCancelled?.(p as TaskCancelledEvent)),
      ),
    )

    console.log('[TaskReactionBus] Initialized — listening to task lifecycle events')
  }

  /** Remove all EventBus listeners. Called by ServiceContainer on shutdown. */
  destroy(): void {
    for (const unsub of this.unsubs) unsub()
    this.unsubs.length = 0
    console.log('[TaskReactionBus] Destroyed')
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private dispatch(
    appEvent: AppEvent,
    invoke: (handler: TaskReactionHandler, payload: unknown) => void | Promise<void>,
  ): void {
    const payload = appEvent.payload as { taskType: string }
    const handlers = this.registry.getForType(payload.taskType)

    for (const handler of handlers) {
      try {
        const result = invoke(handler, payload)
        if (result instanceof Promise) {
          result.catch((err) =>
            console.error(
              `[TaskReactionBus] Async error in handler for type="${payload.taskType}":`,
              err,
            ),
          )
        }
      } catch (err) {
        console.error(
          `[TaskReactionBus] Error in handler for type="${payload.taskType}":`,
          err,
        )
      }
    }
  }
}
