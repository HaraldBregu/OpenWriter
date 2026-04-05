import { END, START, StateGraph } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LoggerService } from '../../services/logger';
import { PainterState, type PainterGraphState } from './state';
import {
	createInterpretIntentAgent,
	interpretIntentAgent,
} from './agents/interpret-intent-agent';
import {
	createCreateImagePromptAgent,
	createImagePromptAgent,
} from './agents/create-image-prompt-agent';
import {
	createCheckAlignmentAgent,
	checkAlignmentAgent,
} from './agents/check-alignment-agent';
import { deliverImageAgent } from './agents/deliver-image-agent';
import { generateImageAgent, type PainterImageGenerator } from './agents/generate-image-agent';

export const PAINTER_SPECIALIST = {
	INTERPRET_INTENT: 'interpret_intent',
	CREATE_IMAGE_PROMPT: 'create_image_prompt',
	GENERATE_IMAGE: 'generate_image',
	CHECK_ALIGNMENT: 'check_alignment',
	DELIVER_IMAGE: 'deliver_image',
} as const;

export interface PainterSpecialistModels {
	[PAINTER_SPECIALIST.INTERPRET_INTENT]: BaseChatModel;
	[PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT]: BaseChatModel;
	[PAINTER_SPECIALIST.CHECK_ALIGNMENT]: BaseChatModel;
}

type PainterSpecialistName = (typeof PAINTER_SPECIALIST)[keyof typeof PAINTER_SPECIALIST];
type PainterSpecialistResult = Partial<PainterGraphState>;
type PainterSpecialistRunner = (state: PainterGraphState) => Promise<PainterSpecialistResult>;

function routeAfterAlignment(
	state: PainterGraphState
): typeof PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT | typeof PAINTER_SPECIALIST.DELIVER_IMAGE {
	return !state.alignmentApproved && state.revisionCount < state.maxRevisions
		? PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT
		: PAINTER_SPECIALIST.DELIVER_IMAGE;
}

function withNodeLogging(
	nodeName: PainterSpecialistName,
	logger: LoggerService | undefined,
	runNode: PainterSpecialistRunner
): PainterSpecialistRunner {
	return async (state) => {
		const startedAt = Date.now();

		logger?.debug('PainterGraph', `Entering node ${nodeName}`, {
			phaseLabel: state.phaseLabel,
			revisionCount: state.revisionCount,
		});

		try {
			const result = await runNode(state);

			logger?.info('PainterGraph', `Completed node ${nodeName}`, {
				durationMs: Date.now() - startedAt,
				updatedKeys: Object.keys(result),
				nextPhaseLabel:
					typeof result.phaseLabel === 'string' ? result.phaseLabel : state.phaseLabel,
			});

			return result;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger?.error('PainterGraph', `Node ${nodeName} failed: ${message}`, {
				durationMs: Date.now() - startedAt,
			});
			throw error;
		}
	};
}

export function createPainterGraph(
	models: PainterSpecialistModels,
	imageGenerator: PainterImageGenerator,
	logger?: LoggerService
) {
	const specialists = {
		[PAINTER_SPECIALIST.INTERPRET_INTENT]: createInterpretIntentAgent(
			models[PAINTER_SPECIALIST.INTERPRET_INTENT]
		),
		[PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT]: createCreateImagePromptAgent(
			models[PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT]
		),
		[PAINTER_SPECIALIST.CHECK_ALIGNMENT]: createCheckAlignmentAgent(
			models[PAINTER_SPECIALIST.CHECK_ALIGNMENT]
		),
	};

	return new StateGraph(PainterState)
		.addNode(
			PAINTER_SPECIALIST.INTERPRET_INTENT,
			withNodeLogging(PAINTER_SPECIALIST.INTERPRET_INTENT, logger, (state) =>
				interpretIntentAgent(state, specialists[PAINTER_SPECIALIST.INTERPRET_INTENT])
			)
		)
		.addNode(
			PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT,
			withNodeLogging(PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT, logger, (state) =>
				createImagePromptAgent(state, specialists[PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT])
			)
		)
		.addNode(
			PAINTER_SPECIALIST.GENERATE_IMAGE,
			withNodeLogging(PAINTER_SPECIALIST.GENERATE_IMAGE, logger, (state) =>
				generateImageAgent(state, imageGenerator)
			)
		)
		.addNode(
			PAINTER_SPECIALIST.CHECK_ALIGNMENT,
			withNodeLogging(PAINTER_SPECIALIST.CHECK_ALIGNMENT, logger, (state) =>
				checkAlignmentAgent(state, specialists[PAINTER_SPECIALIST.CHECK_ALIGNMENT])
			)
		)
		.addNode(
			PAINTER_SPECIALIST.DELIVER_IMAGE,
			withNodeLogging(PAINTER_SPECIALIST.DELIVER_IMAGE, logger, deliverImageAgent)
		)
		.addEdge(START, PAINTER_SPECIALIST.INTERPRET_INTENT)
		.addEdge(PAINTER_SPECIALIST.INTERPRET_INTENT, PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT)
		.addEdge(PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT, PAINTER_SPECIALIST.GENERATE_IMAGE)
		.addEdge(PAINTER_SPECIALIST.GENERATE_IMAGE, PAINTER_SPECIALIST.CHECK_ALIGNMENT)
		.addConditionalEdges(PAINTER_SPECIALIST.CHECK_ALIGNMENT, routeAfterAlignment, [
			PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT,
			PAINTER_SPECIALIST.DELIVER_IMAGE,
		])
		.addEdge(PAINTER_SPECIALIST.DELIVER_IMAGE, END)
		.compile();
}
