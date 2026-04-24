import type { TaskState } from '../../../../../../../shared/types';
import type { ChatMessageStatus } from './types';

export function mapTaskStatusToChatStatus(status: TaskState): ChatMessageStatus {
	switch (status) {
		case 'queued':
		case 'started':
			return 'queued';
		case 'running':
			return 'running';
		case 'finished':
			return 'completed';
		case 'cancelled':
			return 'cancelled';
		default:
			return 'running';
	}
}
