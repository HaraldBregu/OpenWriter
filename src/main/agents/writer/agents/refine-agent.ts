import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { WRITER_STATE_MESSAGES } from '../messages';
import {
	createWriterSpecialistAgent,
	invokeWriterSpecialist,
	type WriterSpecialistAgent,
} from '../specialist-agent';
import { WriterState } from '../state';

const SYSTEM_PROMPT = `You are the refinement specialist in a writer workflow.

You receive the current response plus reviewer feedback.

Return only the revised draft text.

Rules:

- Fix the concrete issues called out by the reviewer.
- Preserve what already works.
- Keep the response aligned with the user's intent and context.
- Respect explicit tone, audience, and length constraints.
- Do not add labels, explanations, or meta commentary.`;

function buildHumanMessage(state: typeof WriterState.State): string {
	return [
		'Original request and context:',
		state.prompt,
		'',
		'Normalized request:',
		state.normalizedPrompt || state.prompt,
		'',
		'Intent:',
		state.intent,
		'',
		'Audience guidance:',
		state.audienceGuidance || 'Use the audience implied by the request and context.',
		'',
		'Tone guidance:',
		state.toneGuidance || 'Match the surrounding voice.',
		'',
		'Length guidance:',
		state.lengthGuidance || 'Use a sensible default length for the task.',
		'',
		'Current response:',
		'<current_response>',
		state.alignedResponse || state.draftResponse,
		'</current_response>',
		'',
		'Reviewer guidance:',
		'<reviewer_guidance>',
		state.refinementGuidance || 'Improve the response where needed.',
		'</reviewer_guidance>',
	].join('\n');
}

export function createRefineAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function refineAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const currentResponse = (state.alignedResponse || state.draftResponse).trim();

	if (currentResponse.length === 0) {
		logger?.debug('WriterRefineAgent', 'Skipping refinement because the current response is empty');
		return {
			draftResponse: '',
			revisionCount: state.revisionCount + 1,
			phaseLabel: WRITER_STATE_MESSAGES.ALIGN,
		};
	}

	logger?.debug('WriterRefineAgent', 'Starting refinement', {
		revisionCount: state.revisionCount,
		currentLength: currentResponse.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const draftResponse = await invokeWriterSpecialist(agent, messages);

	logger?.info('WriterRefineAgent', 'Refinement completed', {
		revisionCount: state.revisionCount + 1,
		draftLength: draftResponse.length,
	});

	return {
		draftResponse,
		revisionCount: state.revisionCount + 1,
		phaseLabel: WRITER_STATE_MESSAGES.ALIGN,
	};
}
