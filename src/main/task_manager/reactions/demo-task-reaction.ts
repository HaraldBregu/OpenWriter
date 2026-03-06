/**
 * DemoTaskReaction — main-process side-effects for the 'demo' task type.
 *
 * Demonstrates the TaskReactionHandler pattern: each lifecycle method receives
 * a typed event and can trigger real side-effects (notifications, DB writes,
 * chained tasks, analytics, etc.) without coupling to the executor itself.
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
import type { DemoTaskInput } from '../handlers/demo-task-handler';

function variant(input: unknown): string {
	return (input as DemoTaskInput)?.variant ?? 'unknown';
}

export class DemoTaskReaction implements TaskReactionHandler {
	readonly taskType = 'demo';

	constructor(private readonly logger?: LoggerService) {}

	onSubmitted(event: TaskSubmittedEvent): void {
		this.logger?.debug(
			'DemoTaskReaction',
			`submitted id=${event.taskId.slice(0, 8)} variant=${variant(event.input)} priority=${event.priority}`
		);
	}

	onStarted(event: TaskStartedEvent): void {
		this.logger?.debug('DemoTaskReaction', `started id=${event.taskId.slice(0, 8)}`);
	}

	onCompleted(event: TaskCompletedEvent): void {
		this.logger?.debug(
			'DemoTaskReaction',
			`completed id=${event.taskId.slice(0, 8)} duration=${event.durationMs}ms`
		);
	}

	onFailed(event: TaskFailedEvent): void {
		this.logger?.warn(
			'DemoTaskReaction',
			`failed id=${event.taskId.slice(0, 8)} error="${event.error}"`
		);
	}

	onCancelled(event: TaskCancelledEvent): void {
		this.logger?.debug('DemoTaskReaction', `cancelled id=${event.taskId.slice(0, 8)}`);
	}
}
