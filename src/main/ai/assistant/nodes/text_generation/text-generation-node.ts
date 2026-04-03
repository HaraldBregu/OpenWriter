import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { extractTokenFromChunk } from '../../../../shared/ai-utils';
import { toLangChainHistoryMessages } from '../../../core/history';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './TEXT_GENERATION_SYSTEM.md?raw';

const EMPTY_TEXT_FINDINGS = 'No text draft was generated because no user request was provided.';

function buildHumanMessage(
	prompt: string,
	normalizedPrompt: string,
	intentFindings: string,
	plannerFindings: string
): string {
	return [
		'Original user request:',
		prompt,
		'',
		'Normalized request:',
		normalizedPrompt,
		'',
		'Intent classification:',
		'<intent_findings>',
		intentFindings,
		'</intent_findings>',
		'',
		'Planner brief:',
		'<planner_findings>',
		plannerFindings || 'No planner brief was provided.',
		'</planner_findings>',
	].join('\n');
}

export async function textGenerationNode(
	state: typeof AssistantState.State,
	model: BaseChatModel,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();
	const normalizedPrompt = (state.normalizedPrompt || state.prompt).trim();

	if (prompt.length === 0) {
		logger?.debug('TextGenerationNode', 'Skipping text generation for empty prompt');
		return { textFindings: EMPTY_TEXT_FINDINGS };
	}

	logger?.debug('TextGenerationNode', 'Starting text generation', {
		promptLength: prompt.length,
		normalizedPromptLength: normalizedPrompt.length,
	});

	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(
			buildHumanMessage(
				state.prompt,
				normalizedPrompt,
				state.intentFindings,
				state.plannerFindings
			)
		),
	];
	const response = await model.invoke(messages);
	const textFindings = extractTokenFromChunk(response.content).trim();

	logger?.info('TextGenerationNode', 'Text draft generated', {
		findingsLength: textFindings.length,
	});

	return {
		textFindings: textFindings || EMPTY_TEXT_FINDINGS,
	};
}
