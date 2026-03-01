/**
 * DemoTaskReaction — main-process side-effects for the 'demo' task type.
 *
 * Demonstrates the TaskReactionHandler pattern: each lifecycle method receives
 * a typed event and can trigger real side-effects (notifications, DB writes,
 * chained tasks, analytics, etc.) without coupling to the executor itself.
 */

import type {
  TaskReactionHandler,
  TaskSubmittedEvent,
  TaskStartedEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
  TaskCancelledEvent,
} from '../TaskReactionHandler'
import type { DemoTaskInput } from '../handlers/DemoTaskHandler'

function variant(input: unknown): string {
  return (input as DemoTaskInput)?.variant ?? 'unknown'
}

export class DemoTaskReaction implements TaskReactionHandler {
  readonly taskType = 'demo'

  onSubmitted(event: TaskSubmittedEvent): void {
    console.log(
      `[DemoTaskReaction] ▶ submitted  id=${event.taskId.slice(0, 8)} variant=${variant(event.input)} priority=${event.priority}`,
    )
  }

  onStarted(event: TaskStartedEvent): void {
    console.log(`[DemoTaskReaction] ⚙ started    id=${event.taskId.slice(0, 8)}`)
  }

  onCompleted(event: TaskCompletedEvent): void {
    console.log(
      `[DemoTaskReaction] ✓ completed  id=${event.taskId.slice(0, 8)} duration=${event.durationMs}ms`,
    )
  }

  onFailed(event: TaskFailedEvent): void {
    console.warn(
      `[DemoTaskReaction] ✗ failed     id=${event.taskId.slice(0, 8)} error="${event.error}"`,
    )
  }

  onCancelled(event: TaskCancelledEvent): void {
    console.log(`[DemoTaskReaction] ⊘ cancelled  id=${event.taskId.slice(0, 8)}`)
  }
}
