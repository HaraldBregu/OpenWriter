import { BrowserWindow } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import type { TaskExecutor } from '../task_manager/task-executor';
import type { TaskOptions, ActiveTask } from '../task_manager/task-descriptor';
import type { TaskInfo, TaskPriority } from '../../shared/types';
import { registerQuery, registerCommand, registerCommandWithEvent } from './ipc-gateway';
import { TaskChannels } from '../../shared/channels';

/** Input payload for task:submit channel. */
interface TaskSubmitInput {
	type: string;
	input: unknown;
	options?: TaskOptions;
	metadata?: Record<string, unknown>;
}

/** Strip non-serializable fields from ActiveTask for IPC transport. */
function toTaskInfo(t: ActiveTask): TaskInfo {
	return {
		taskId: t.taskId,
		type: t.type,
		status: t.status,
		priority: t.priority,
		startedAt: t.startedAt,
		completedAt: t.completedAt,
		windowId: t.windowId,
		error: t.error,
	};
}

/**
 * IPC handlers for the background task system.
 *
 * Channels (invoke/handle):
 *  - task:submit          (command) -- Submit a new task. Returns { taskId }.
 *  - task:cancel          (command) -- Cancel a running/queued task. Returns boolean.
 *  - task:list            (query)   -- List active tasks. Returns TaskInfo[].
 *  - task:update-priority (command) -- Update priority of a queued task. Returns boolean.
 *  - task:get-result      (query)   -- Retrieve completed task info by ID. Returns TaskInfo | null.
 *  - task:queue-status    (query)   -- Return queue metrics. Returns TaskQueueStatus.
 *
 * Streaming events are pushed from TaskExecutor via EventBus on the
 * `task:event` channel. The renderer subscribes with window.taskManager.onEvent().
 *
 * Security notes:
 *  - windowId is always stamped from event.sender.id in task:submit, never trusted from payload.
 *  - updatePriority operates on any task by ID; window-scoping enforcement is at the service
 *    level (tasks owned by other windows will simply return false if not found).
 *  - getResult is intentionally not window-scoped so developers can retrieve any task result
 *    by ID — guard this at the application layer if cross-window access is undesirable.
 */
export class TaskManagerIpc implements IpcModule {
	readonly name = 'task';

	register(container: ServiceContainer, eventBus: EventBus): void {
		const executor = container.get<TaskExecutor>('taskExecutor');
		const logger = container.get<LoggerService>('logger');

		/**
		 * Submit a new task for background execution.
		 * The windowId is stamped server-side from event.sender.id for security.
		 */
		registerCommandWithEvent(TaskChannels.submit, async (event, payload: TaskSubmitInput) => {
			const options: TaskOptions = { ...payload.options };
			// Security: derive BrowserWindow.id from webContents (not event.sender.id,
			// which is webContents.id — a different integer that EventBus.sendTo cannot resolve).
			const senderWindow = BrowserWindow.fromWebContents(event.sender);
			const windowId = senderWindow?.id;
			options.windowId = windowId;

			// Inject server-stamped windowId into object inputs so handlers can
			// resolve window-scoped services.
			const input =
				typeof payload.input === 'object' && payload.input !== null
					? { ...(payload.input as Record<string, unknown>), windowId }
					: payload.input;

			const taskId = await executor.submit(payload.type, input, options);
			return { taskId };
		});

		/**
		 * Cancel a running or queued task.
		 */
		registerCommand(TaskChannels.cancel, (taskId: string) => {
			return executor.cancel(taskId);
		});

		/**
		 * List all active tasks (queued + running).
		 */
		registerQuery(TaskChannels.list, () => {
			return executor.listTasks().map(toTaskInfo);
		});

		/**
		 * Update the priority of a queued task.
		 * The queue is re-sorted immediately and a priority-changed event is emitted.
		 * Returns true if the task was found and updated.
		 */
		registerCommand(TaskChannels.updatePriority, (taskId: string, priority: TaskPriority) => {
			// Validate priority value to prevent invalid state from untrusted renderer input
			if (priority !== 'low' && priority !== 'normal' && priority !== 'high') {
				throw new Error(`Invalid priority value: ${String(priority)}`);
			}
			return executor.updatePriority(taskId, priority);
		});

		/**
		 * Retrieve a completed, errored, or cancelled task result by ID.
		 * Active tasks (queued/running) are also returned.
		 * Returns null if the task ID is unknown or its TTL has expired.
		 */
		registerQuery(TaskChannels.getResult, (taskId: string) => {
			const task = executor.getTaskResult(taskId);
			return task ? toTaskInfo(task) : null;
		});

		/**
		 * Return a snapshot of queue metrics: queued, running, completed counts.
		 */
		registerQuery(TaskChannels.queueStatus, () => {
			return executor.getQueueStatus();
		});

		// --- Window close cleanup -------------------------------------------------
		// When a window closes, cancel all tasks owned by it to prevent orphaned work.
		eventBus.on('window:closed', (event) => {
			const { windowId } = event.payload as { windowId: number };
			const cancelledCount = executor.cancelByWindow(windowId);
			if (cancelledCount > 0) {
				logger.info(
					'TaskManagerIpc',
					`Cancelled ${cancelledCount} task(s) for closed window ${windowId}`
				);
			}
		});

		logger.info('TaskManagerIpc', `Registered ${this.name} module`);
	}
}
