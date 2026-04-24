import { BrowserWindow } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../services/logger';
import type { TaskExecutor } from '../task/task-executor';
import type { TaskOptions, ActiveTask } from '../task/task-descriptor';
import type { TaskAction, TaskInfo } from '../../shared/types';
import { registerQuery, registerCommand, registerCommandWithEvent } from './ipc-gateway';
import { TaskChannels } from '../../shared/channels';

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
		metadata: t.metadata,
	};
}

/**
 * IPC handlers for the background task system.
 *
 * Channels (invoke/handle):
 *  - task:submit  (command) -- Submit a new task. Returns { taskId }.
 *  - task:cancel  (command) -- Cancel a running/queued task. Returns boolean.
 *  - task:list    (query)   -- List active tasks. Returns TaskInfo[].
 *
 * Streaming events are pushed from TaskExecutor via EventBus on the
 * `task:event` channel. The renderer subscribes with window.task.onEvent().
 *
 * Security notes:
 *  - windowId is always stamped from event.sender.id in task:submit, never trusted from payload.
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
		registerCommandWithEvent(TaskChannels.submit, async (event, action: TaskAction) => {
			// Security: derive BrowserWindow.id from webContents (not event.sender.id,
			// which is webContents.id — a different integer that EventBus.sendTo cannot resolve).
			const senderWindow = BrowserWindow.fromWebContents(event.sender);
			const options: TaskOptions = {
				windowId: senderWindow?.id,
				metadata: action.metadata,
			};
			void options;

			const taskId = await executor.submit(action.type, action.input, options);
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
