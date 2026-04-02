import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../../core/history';
import type { AssistantState } from '../../state';

function buildHumanMessage(prompt: string, intent: string, ragContext: string): string {
	const parts = [`Detected intent: ${intent}`];
	const trimmedRagContext = ragContext.trim();

	if (trimmedRagContext) {
		parts.push(
			'',
			'Retrieved workspace context:',
			'Use this context when it is relevant to the user request.',
			'<workspace_context>',
			trimmedRagContext,
			'</workspace_context>'
		);
	}

	parts.push('', 'User request:', prompt);
	return parts.join('\n');
}

export async function respondWithSpecialist(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	systemPrompt: string
): Promise<Partial<typeof AssistantState.State>> {
	const messages: BaseMessage[] = [
		new SystemMessage(systemPrompt),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state.prompt, state.intent, state.ragContext)),
	];

	let response = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			response += token;
		}
	}

	return { response };
}
