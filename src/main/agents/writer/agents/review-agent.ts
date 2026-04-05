import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { parseYesNo, readLabeledValue } from '../agent-output';
import { WRITER_STATE_MESSAGES } from '../messages';
import {
	createWriterSpecialistAgent,
	invokeWriterSpecialist,
	type WriterSpecialistAgent,
} from '../specialist-agent';
import { WriterState } from '../state';

const SYSTEM_PROMPT = `You are the reviewer in a writer workflow.

You receive the user's request, writing guidance, and the current aligned
response.

Return exactly three lines in this format:

Satisfactory: yes|no
Refinement guidance: ...
Reasoning: ...

Rules:

- Answer yes when the response satisfies the request, tone, length, audience,
  and surrounding context.
- Answer no only when there are concrete issues a refinement pass can fix.
- If the revision count has already reached the maximum, answer yes unless the
  response is clearly unusable.
- Keep refinement guidance specific and concise.`;

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
		'Revision count:',
		`${state.revisionCount} of ${state.maxRefinements}`,
		'',
		'Current aligned response:',
		'<aligned_response>',
		state.alignedResponse,
		'</aligned_response>',
	].join('\n');
}

function buildReviewFindings(
	satisfactory: boolean,
	refinementGuidance: string,
	reasoning: string
): string {
	return [
		`Satisfactory: ${satisfactory ? 'yes' : 'no'}`,
		`Refinement guidance: ${refinementGuidance}`,
		`Reasoning: ${reasoning}`,
	].join('\n');
}

export function createReviewAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function reviewAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const alignedResponse = state.alignedResponse.trim();

	if (alignedResponse.length === 0) {
		const canRefine = state.revisionCount < state.maxRefinements;
		const guidance = 'Produce a complete response before returning it.';

		logger?.debug('WriterReviewAgent', 'Marking response for refinement because the aligned response is empty');
		return {
			reviewFindings: buildReviewFindings(
				false,
				guidance,
				'The aligned response was empty.'
			),
			needsRefinement: canRefine,
			refinementGuidance: guidance,
			phaseLabel: canRefine ? WRITER_STATE_MESSAGES.REFINE : WRITER_STATE_MESSAGES.RETURN,
		};
	}

	logger?.debug('WriterReviewAgent', 'Starting review', {
		revisionCount: state.revisionCount,
		alignedLength: alignedResponse.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(state)),
	];
	const rawReview = await invokeWriterSpecialist(agent, messages);
	const parsedSatisfactory = parseYesNo(
		readLabeledValue(rawReview, 'Satisfactory'),
		true
	);
	const refinementGuidance =
		readLabeledValue(rawReview, 'Refinement guidance') || 'No refinement guidance provided.';
	const reasoning =
		readLabeledValue(rawReview, 'Reasoning') ||
		'Structured review succeeded without additional reasoning.';
	const canRefine = !parsedSatisfactory && state.revisionCount < state.maxRefinements;

	logger?.info('WriterReviewAgent', 'Review completed', {
		satisfactory: parsedSatisfactory,
		canRefine,
		revisionCount: state.revisionCount,
	});

	return {
		reviewFindings: buildReviewFindings(parsedSatisfactory, refinementGuidance, reasoning),
		needsRefinement: canRefine,
		refinementGuidance,
		phaseLabel: canRefine ? WRITER_STATE_MESSAGES.REFINE : WRITER_STATE_MESSAGES.RETURN,
	};
}
