import type { TaskSnapshot } from '../../../../../services/task-event-bus';
import type { ChatMessageStatus } from './types';

export function mapTaskStatusToChatStatus(status: TaskSnapshot['status']): ChatMessageStatus {
	switch (status) {
		case 'queued':
		case 'started':
			return 'queued';
		case 'running':
			return 'running';
		case 'completed':
			return 'completed';
		case 'error':
			return 'error';
		case 'cancelled':
			return 'cancelled';
		default:
			return 'running';
	}
}
