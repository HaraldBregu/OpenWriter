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

const SYSTEM_PROMPT = `You are the text generator agent in a multi-agent assistant.

You receive the user's request, a normalized request, an intent note, and the
planner's execution brief.

Produce an internal text draft for another assistant, not a final user-facing
reply.

Rules:

- Follow the planner's brief closely.
- Draft the strongest direct text response you can before retrieval and web
  search findings are merged in.
- If the user asked for an image or other visual, do not pretend it has already
  been generated or attached. Offer text-only help instead.
- Keep the draft concise, useful, and easy to merge with retrieval findings.
- Do not mention internal routing or hidden analysis.`;

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
			buildHumanMessage(state.prompt, normalizedPrompt, state.intentFindings, state.plannerFindings)
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
