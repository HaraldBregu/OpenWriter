/**
 * TextEnhanceTaskReaction — main-process side-effects for the 'agent-text-enhance' task type.
 *
 * Logs lifecycle events (submitted, started, completed, failed, cancelled)
 * for observability and debugging of text enhancement agent tasks.
 */

import type { LoggerService } from '../../services/logger';
import type {
	TaskReactionHandler,
	TaskSubmittedEvent,
	TaskStartedEvent,
	TaskCompletedEvent,
	TaskFailedEvent,
	TaskCancelledEvent,
} from '../task-reaction-handler';

const TAG = 'TextEnhanceTaskReaction';

export class TextEnhanceTaskReaction implements TaskReactionHandler {
	readonly taskType = 'agent-text-enhance';

	constructor(private readonly logger?: LoggerService) {}

	onSubmitted(event: TaskSubmittedEvent): void {
		this.logger?.debug(
			TAG,
			`submitted id=${event.taskId.slice(0, 8)} priority=${event.priority}`
		);
	}

	onStarted(event: TaskStartedEvent): void {
		this.logger?.debug(TAG, `started id=${event.taskId.slice(0, 8)}`);
	}

	onCompleted(event: TaskCompletedEvent): void {
		this.logger?.debug(
			TAG,
			`completed id=${event.taskId.slice(0, 8)} duration=${event.durationMs}ms`
		);
	}

	onFailed(event: TaskFailedEvent): void {
		this.logger?.warn(
			TAG,
			`failed id=${event.taskId.slice(0, 8)} error="${event.error}"`
		);
	}

	onCancelled(event: TaskCancelledEvent): void {
		this.logger?.debug(TAG, `cancelled id=${event.taskId.slice(0, 8)}`);
	}
}
