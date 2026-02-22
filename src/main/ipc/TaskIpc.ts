import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { TaskExecutorService } from '../tasks/TaskExecutorService'
import type { TaskOptions } from '../tasks/TaskDescriptor'
import { wrapSimpleHandler } from './IpcErrorHandler'

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
 *  - task:submit  (invoke) -- Submit a new task. Returns { taskId }.
 *  - task:cancel  (invoke) -- Cancel a running/queued task. Returns boolean.
 *  - task:list    (invoke) -- List active tasks. Returns TaskInfo[].
 *
 * Streaming events are pushed from TaskExecutorService via EventBus on the
 * `task:event` channel. The renderer subscribes with onTaskEvent().
 */
export class TaskIpc implements IpcModule {
  readonly name = 'task'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const executor = container.get<TaskExecutorService>('taskExecutor')

    /**
     * Submit a new task for background execution.
     *
     * Channel: 'task:submit'
     * Input: { type: string, input: unknown, options?: TaskOptions }
     * Output: { taskId: string }
     */
    ipcMain.handle(
      'task:submit',
      wrapSimpleHandler(async (payload: TaskSubmitInput) => {
        const taskId = await executor.submit(payload.type, payload.input, payload.options)
        return { taskId }
      }, 'task:submit')
    )

    /**
     * Cancel a running or queued task.
     *
     * Channel: 'task:cancel'
     * Input: string (taskId)
     * Output: boolean (true if task was found and cancelled)
     */
    ipcMain.handle(
      'task:cancel',
      wrapSimpleHandler((taskId: string) => {
        return executor.cancel(taskId)
      }, 'task:cancel')
    )

    /**
     * List all active tasks (queued + running).
     *
     * Channel: 'task:list'
     * Input: none
     * Output: TaskInfo[]
     */
    ipcMain.handle(
      'task:list',
      wrapSimpleHandler(() => {
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
      }, 'task:list')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
