import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import { ASSISTANT_STATE_MESSAGES } from '../../messages';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './AGGREGATE_SYSTEM.md?raw';

function buildHumanMessage(
	prompt: string,
	intentFindings: string,
	textFindings: string,
	ragFindings: string,
	imageFindings: string
): string {
	return [
		'Original user request:',
		prompt,
		'',
		'Intent classification:',
		'<intent_findings>',
		intentFindings || 'No intent findings available.',
		'</intent_findings>',
		'',
		'Text generation output:',
		'<text_findings>',
		textFindings || 'No text draft was generated.',
		'</text_findings>',
		'',
		'RAG output:',
		'<rag_findings>',
		ragFindings || 'No relevant workspace context was found for this request.',
		'</rag_findings>',
		'',
		'Image generation output:',
		'<image_findings>',
		imageFindings || 'No image output was requested.',
		'</image_findings>',
	].join('\n');
}

export async function aggregateNode(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const humanMessage = buildHumanMessage(
		state.prompt,
		state.intentFindings,
		state.textFindings,
		state.ragFindings,
		state.imageFindings
	);
	logger?.debug('AggregateNode', 'Starting aggregate generation', {
		promptLength: state.prompt.length,
		intentFindingsLength: state.intentFindings.length,
		textFindingsLength: state.textFindings.length,
		ragFindingsLength: state.ragFindings.length,
		imageFindingsLength: state.imageFindings.length,
	});

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(humanMessage),
	];

	let response = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			response += token;
		}
	}

	logger?.info('AggregateNode', 'Aggregate response generated', {
		responseLength: response.length,
	});

	return {
		phaseLabel: ASSISTANT_STATE_MESSAGES.AGGREGATE,
		response,
	};
}
