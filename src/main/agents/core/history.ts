import type { ChatMessage } from '../../shared/ai-types';
import type { AgentHistoryMessage } from './types';

export function toHistoryMessages(history: AgentHistoryMessage[] | undefined): ChatMessage[] {
	return (history ?? []).map((message) => ({
		role: message.role,
		content: message.content,
	}));
}
