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

const SYSTEM_PROMPT = `You are the alignment specialist in a writer workflow.

You receive the user's original request, the inferred writing intent, guidance,
and the current draft.

Return only the final aligned response.

Rules:

- Align the draft to the requested tone, length, and audience.
- Preserve the strongest parts of the draft.
- Respect explicit constraints such as word limits or brevity requests.
- When the request is an inline continuation, make the text flow naturally with
  the surrounding context.
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
		'Intent notes:',
		state.intentFindings || 'No extra intent notes.',
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
		'Current draft:',
		'<draft>',
		state.draftResponse,
		'</draft>',
	].join('\n');
}

export function createAlignAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function alignAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const draft = state.draftResponse.trim();

	if (draft.length === 0) {
		logger?.debug('WriterAlignAgent', 'Skipping alignment because the draft is empty');
		return {
			alignedResponse: '',
			phaseLabel: WRITER_STATE_MESSAGES.REVIEW,
		};
	}

	logger?.debug('WriterAlignAgent', 'Starting alignment', {
		draftLength: draft.length,
		intent: state.intent,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const alignedResponse = await invokeWriterSpecialist(agent, messages);

	logger?.info('WriterAlignAgent', 'Alignment completed', {
		alignedLength: alignedResponse.length,
	});

	return {
		alignedResponse,
		phaseLabel: WRITER_STATE_MESSAGES.REVIEW,
	};
}
