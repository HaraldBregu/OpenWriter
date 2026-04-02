import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './AGGREGATE_SYSTEM.md?raw';

function buildHumanMessage(
	prompt: string,
	ragFindings: string,
	grammarFindings: string
): string {
	return [
		'Original user request:',
		prompt,
		'',
		'RAG findings:',
		'<rag_findings>',
		ragFindings || 'No relevant workspace context was found for this request.',
		'</rag_findings>',
		'',
		'Grammar and clarity findings:',
		'<grammar_findings>',
		grammarFindings || 'No grammar findings available.',
		'</grammar_findings>',
	].join('\n');
}

export async function aggregateNode(
	state: typeof AssistantState.State,
	model: BaseChatModel
): Promise<Partial<typeof AssistantState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state.prompt, state.ragFindings, state.grammarFindings)),
	];

	let response = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			response += token;
		}
	}

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.AGGREGATE,
		response,
	};
}
