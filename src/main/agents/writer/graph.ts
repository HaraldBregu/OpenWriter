import { END, START, StateGraph } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import { WriterState } from './state';
import { alignAgent, createAlignAgent } from './agents/align-agent';
import { createDraftAgent, draftAgent } from './agents/draft-agent';
import { createRefineAgent, refineAgent } from './agents/refine-agent';
import { createReviewAgent, reviewAgent } from './agents/review-agent';
import { returnResponseAgent } from './agents/return-response-agent';
import {
	createUnderstandIntentAgent,
	understandIntentAgent,
} from './agents/understand-intent-agent';

const LOG_SOURCE = 'WriterGraph';

export const WRITER_SPECIALIST = {
	UNDERSTAND_INTENT: 'understand_intent',
	DRAFT_RESPONSE: 'draft_response',
	ALIGN_RESPONSE: 'align_response',
	REVIEW_RESPONSE: 'review_response',
	REFINE_RESPONSE: 'refine_response',
	RETURN_RESPONSE: 'return_response',
} as const;

export interface WriterSpecialistModels {
	[WRITER_SPECIALIST.UNDERSTAND_INTENT]: BaseChatModel;
	[WRITER_SPECIALIST.DRAFT_RESPONSE]: BaseChatModel;
	[WRITER_SPECIALIST.ALIGN_RESPONSE]: BaseChatModel;
	[WRITER_SPECIALIST.REVIEW_RESPONSE]: BaseChatModel;
	[WRITER_SPECIALIST.REFINE_RESPONSE]: BaseChatModel;
}

type WriterSpecialistName = (typeof WRITER_SPECIALIST)[keyof typeof WRITER_SPECIALIST];
type WriterGraphState = typeof WriterState.State;
type WriterSpecialistResult = Partial<WriterGraphState>;
type WriterSpecialistRunner = (state: WriterGraphState) => Promise<WriterSpecialistResult>;

function routeAfterReview(
	state: WriterGraphState
): typeof WRITER_SPECIALIST.REFINE_RESPONSE | typeof WRITER_SPECIALIST.RETURN_RESPONSE {
	return state.needsRefinement
		? WRITER_SPECIALIST.REFINE_RESPONSE
		: WRITER_SPECIALIST.RETURN_RESPONSE;
}

function withSpecialistLogging(
	specialistName: WriterSpecialistName,
	logger: LoggerService | undefined,
	runSpecialist: WriterSpecialistRunner
): WriterSpecialistRunner {
	return async (state) => {
		const startedAt = Date.now();

		logger?.debug(LOG_SOURCE, `Entering specialist ${specialistName}`, {
			phaseLabel: state.phaseLabel,
			promptLength: state.prompt.length,
		});

		try {
			const result = await runSpecialist(state);

			logger?.info(LOG_SOURCE, `Completed specialist ${specialistName}`, {
				durationMs: Date.now() - startedAt,
				updatedKeys: Object.keys(result),
				nextPhaseLabel:
					typeof result.phaseLabel === 'string' ? result.phaseLabel : state.phaseLabel,
			});

			return result;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger?.error(LOG_SOURCE, `Specialist ${specialistName} failed: ${message}`, {
				durationMs: Date.now() - startedAt,
			});
			throw error;
		}
	};
}

export function buildGraph(models: BaseChatModel | NodeModelMap, logger?: LoggerService) {
	const m = models as unknown as WriterSpecialistModels;
	const specialists = {
		[WRITER_SPECIALIST.UNDERSTAND_INTENT]: createUnderstandIntentAgent(
			m[WRITER_SPECIALIST.UNDERSTAND_INTENT]
		),
		[WRITER_SPECIALIST.DRAFT_RESPONSE]: createDraftAgent(m[WRITER_SPECIALIST.DRAFT_RESPONSE]),
		[WRITER_SPECIALIST.ALIGN_RESPONSE]: createAlignAgent(m[WRITER_SPECIALIST.ALIGN_RESPONSE]),
		[WRITER_SPECIALIST.REVIEW_RESPONSE]: createReviewAgent(m[WRITER_SPECIALIST.REVIEW_RESPONSE]),
		[WRITER_SPECIALIST.REFINE_RESPONSE]: createRefineAgent(m[WRITER_SPECIALIST.REFINE_RESPONSE]),
	};

	logger?.info(LOG_SOURCE, 'Building writer graph', {
		specialistCount: Object.keys(WRITER_SPECIALIST).length,
	});

	return new StateGraph(WriterState)
		.addNode(
			WRITER_SPECIALIST.UNDERSTAND_INTENT,
			withSpecialistLogging(WRITER_SPECIALIST.UNDERSTAND_INTENT, logger, (state) =>
				understandIntentAgent(state, specialists[WRITER_SPECIALIST.UNDERSTAND_INTENT], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.DRAFT_RESPONSE,
			withSpecialistLogging(WRITER_SPECIALIST.DRAFT_RESPONSE, logger, (state) =>
				draftAgent(state, specialists[WRITER_SPECIALIST.DRAFT_RESPONSE], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.ALIGN_RESPONSE,
			withSpecialistLogging(WRITER_SPECIALIST.ALIGN_RESPONSE, logger, (state) =>
				alignAgent(state, specialists[WRITER_SPECIALIST.ALIGN_RESPONSE], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.REVIEW_RESPONSE,
			withSpecialistLogging(WRITER_SPECIALIST.REVIEW_RESPONSE, logger, (state) =>
				reviewAgent(state, specialists[WRITER_SPECIALIST.REVIEW_RESPONSE], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.REFINE_RESPONSE,
			withSpecialistLogging(WRITER_SPECIALIST.REFINE_RESPONSE, logger, (state) =>
				refineAgent(state, specialists[WRITER_SPECIALIST.REFINE_RESPONSE], logger)
			)
		)
		.addNode(
			WRITER_SPECIALIST.RETURN_RESPONSE,
			withSpecialistLogging(WRITER_SPECIALIST.RETURN_RESPONSE, logger, (state) =>
				returnResponseAgent(state, logger)
			)
		)
		.addEdge(START, WRITER_SPECIALIST.UNDERSTAND_INTENT)
		.addEdge(WRITER_SPECIALIST.UNDERSTAND_INTENT, WRITER_SPECIALIST.DRAFT_RESPONSE)
		.addEdge(WRITER_SPECIALIST.DRAFT_RESPONSE, WRITER_SPECIALIST.ALIGN_RESPONSE)
		.addEdge(WRITER_SPECIALIST.ALIGN_RESPONSE, WRITER_SPECIALIST.REVIEW_RESPONSE)
		.addConditionalEdges(WRITER_SPECIALIST.REVIEW_RESPONSE, routeAfterReview, [
			WRITER_SPECIALIST.REFINE_RESPONSE,
			WRITER_SPECIALIST.RETURN_RESPONSE,
		])
		.addEdge(WRITER_SPECIALIST.REFINE_RESPONSE, WRITER_SPECIALIST.ALIGN_RESPONSE)
		.addEdge(WRITER_SPECIALIST.RETURN_RESPONSE, END)
		.compile();
}
