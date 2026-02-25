import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { TaskExecutorService } from '../tasks/TaskExecutorService'
import type { TaskOptions } from '../tasks/TaskDescriptor'
import { registerQuery, registerCommand, registerCommandWithEvent } from './IpcGateway'

/**
 * Input payload for task:submit channel.
 */
interface TaskSubmitInput {
  type: string
  input: unknown
  options?: TaskOptions
}

/**
 * Serializable task info returned by task:list.
 * Omits non-serializable fields (AbortController, timeoutHandle) from ActiveTask.
 */
interface TaskInfo {
  taskId: string
  type: string
  status: string
  priority: string
  startedAt?: number
  completedAt?: number
  windowId?: number
  error?: string
}

/**
 * IPC handlers for the background task system.
 *
 * Channels:
 *  - task:submit  (command) -- Submit a new task. Returns { taskId }.
 *  - task:cancel  (command) -- Cancel a running/queued task. Returns boolean.
 *  - task:list    (query)   -- List active tasks. Returns TaskInfo[].
 *
 * Streaming events are pushed from TaskExecutorService via EventBus on the
 * `task:event` channel. The renderer subscribes with onTaskEvent().
 */
export class TaskIpc implements IpcModule {
  readonly name = 'task'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const executor = container.get<TaskExecutorService>('taskExecutor')

    /**
     * Submit a new task for background execution.
     * The windowId is stamped server-side from event.sender.id for security.
     */
    registerCommandWithEvent('task:submit', async (event, payload: TaskSubmitInput) => {
      const options: TaskOptions = { ...payload.options }
      // Security: always trust the sender identity from the event, not the renderer.
      options.windowId = event.sender.id
      const taskId = await executor.submit(payload.type, payload.input, options)
      return { taskId }
    })

    /**
     * Cancel a running or queued task.
     */
    registerCommand('task:cancel', (taskId: string) => {
      return executor.cancel(taskId)
    })

    /**
     * List all active tasks (queued + running).
     */
    registerQuery('task:list', () => {
      const tasks = executor.listTasks()
      // Strip non-serializable fields for IPC transport
      return tasks.map((t): TaskInfo => ({
        taskId: t.taskId,
        type: t.type,
        status: t.status,
        priority: t.priority,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        windowId: t.windowId,
        error: t.error
      }))
    })

    // --- Window close cleanup -------------------------------------------------
    // When a window closes, cancel all tasks owned by it to prevent orphaned work.
    eventBus.on('window:closed', (event) => {
      const { windowId } = event.payload as { windowId: number }
      const cancelledCount = executor.cancelByWindow(windowId)
      if (cancelledCount > 0) {
        console.log(`[TaskIpc] Cancelled ${cancelledCount} task(s) for closed window ${windowId}`)
      }
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
