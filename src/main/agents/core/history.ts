import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { AgentHistoryMessage } from './types';

export function toLangChainHistoryMessages(
	history: AgentHistoryMessage[] | undefined
): BaseMessage[] {
	return (history ?? []).map((message) =>
		message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content)
	);
}
