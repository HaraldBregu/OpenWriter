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

const SYSTEM_PROMPT = `You are the drafting specialist in a writer workflow.

You receive the user's request, surrounding context, inferred intent, and
writing guidance.

Return only the draft text.

Rules:

- continue: extend the text naturally from the provided context without
  repeating existing text.
- improve: refine clarity, tone, and structure while preserving meaning unless
  the user asked for a substantive rewrite.
- transform: adapt the text to the requested style, format, or perspective.
- expand: add detail, depth, or examples while staying on topic.
- condense: keep the essential ideas and remove unnecessary detail.
- unclear: infer the most helpful action from the context; ask one brief
  clarifying question only when the request cannot be resolved safely.
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
	].join('\n');
}

export function createDraftAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function draftAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		logger?.debug('WriterDraftAgent', 'Skipping drafting because the prompt is empty');
		return {
			draftResponse: '',
			phaseLabel: WRITER_STATE_MESSAGES.ALIGN,
		};
	}

	logger?.debug('WriterDraftAgent', 'Starting draft generation', {
		intent: state.intent,
		promptLength: prompt.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const draftResponse = await invokeWriterSpecialist(agent, messages);

	logger?.info('WriterDraftAgent', 'Draft generation completed', {
		draftLength: draftResponse.length,
	});

	return {
		draftResponse,
		phaseLabel: WRITER_STATE_MESSAGES.ALIGN,
	};
}
