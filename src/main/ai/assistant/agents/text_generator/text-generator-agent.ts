import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../../services/logger';
import { toLangChainHistoryMessages } from '../../../core/history';
import {
	createAssistantSpecialistAgent,
	invokeAssistantSpecialist,
	type AssistantSpecialistAgent,
} from '../../specialist-agent';
import type { AssistantState } from '../../state';
import SYSTEM_PROMPT from './TEXT_GENERATOR_SYSTEM.md?raw';

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

export function createTextGeneratorAgent(model: BaseChatModel): AssistantSpecialistAgent {
	return createAssistantSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function textGeneratorAgent(
	state: typeof AssistantState.State,
	agent: AssistantSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof AssistantState.State>> {
	const prompt = state.prompt.trim();
	const normalizedPrompt = (state.normalizedPrompt || state.prompt).trim();

	if (prompt.length === 0) {
		logger?.debug('TextGeneratorAgent', 'Skipping text generation for empty prompt');
		return { textFindings: EMPTY_TEXT_FINDINGS };
	}

	logger?.debug('TextGeneratorAgent', 'Starting text generation', {
		promptLength: prompt.length,
		normalizedPromptLength: normalizedPrompt.length,
	});

	const messages = [
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
	const textFindings = await invokeAssistantSpecialist(agent, messages);

	logger?.info('TextGeneratorAgent', 'Text draft generated', {
		findingsLength: textFindings.length,
	});

	return {
		textFindings: textFindings || EMPTY_TEXT_FINDINGS,
	};
}
