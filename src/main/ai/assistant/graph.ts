import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import { AssistantState } from './state';
import { analyzerAgent } from './agents/analyzer/analyzer-agent';
import { duckDuckGoSearchAgent } from './agents/duckduckgo_search/duckduckgo-search-agent';
import { enhancerAgent } from './agents/enhancer/enhancer-agent';
import { imageGeneratorAgent } from './agents/image_generator/image-generator-agent';
import { imagePromptEnhancerAgent } from './agents/image_prompt_enhancer/image-prompt-enhancer-agent';
import { intentDetectorAgent } from './agents/intent_detector/intent-detector-agent';
import { plannerAgent } from './agents/planner/planner-agent';
import { ragAgent } from './agents/rag_agent/rag-agent';
import { textGeneratorAgent } from './agents/text_generator/text-generator-agent';
import type { RagRetriever } from './agents/rag_agent/rag-retriever';

const LOG_SOURCE = 'AssistantGraph';
const MAX_REVIEW_PASSES = 2;

export const ASSISTANT_SPECIALIST = {
	INTENT_DETECTOR: 'intent_detector',
	PLANNER: 'planner',
	RAG_AGENT: 'rag_agent',
	DUCKDUCKGO_SEARCH: 'duckduckgo_search',
	TEXT_GENERATOR: 'text_generator',
	ANALYZER: 'analyzer',
	ENHANCER: 'enhancer',
	IMAGE_PROMPT_ENHANCER: 'image_prompt_enhancer',
	IMAGE_GENERATOR: 'image_generator',
} as const;

export interface AssistantSpecialistModels {
	[ASSISTANT_SPECIALIST.INTENT_DETECTOR]: BaseChatModel;
	[ASSISTANT_SPECIALIST.PLANNER]: BaseChatModel;
	[ASSISTANT_SPECIALIST.RAG_AGENT]: BaseChatModel;
	[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH]: BaseChatModel;
	[ASSISTANT_SPECIALIST.TEXT_GENERATOR]: BaseChatModel;
	[ASSISTANT_SPECIALIST.ANALYZER]: BaseChatModel;
	[ASSISTANT_SPECIALIST.ENHANCER]: BaseChatModel;
	[ASSISTANT_SPECIALIST.IMAGE_PROMPT_ENHANCER]: BaseChatModel;
	[ASSISTANT_SPECIALIST.IMAGE_GENERATOR]: BaseChatModel;
}

type AssistantSpecialistName =
	(typeof ASSISTANT_SPECIALIST)[keyof typeof ASSISTANT_SPECIALIST];
type AssistantGraphState = typeof AssistantState.State;
type AssistantSpecialistResult = Partial<AssistantGraphState>;
type AssistantSpecialistRunner = (
	state: AssistantGraphState
) => Promise<AssistantSpecialistResult>;

function routeAfterIntent(state: AssistantGraphState): 'image_branch' | 'text_branch' {
	return state.route === 'image' ? 'image_branch' : 'text_branch';
}

function routeAfterAnalysis(state: AssistantGraphState): 'retry' | 'enhance' {
	if (state.shouldRetry && state.reviewCount < MAX_REVIEW_PASSES) {
		return 'retry';
	}

	return 'enhance';
}

function withSpecialistLogging(
	specialistName: AssistantSpecialistName,
	logger: LoggerService | undefined,
	runSpecialist: AssistantSpecialistRunner
): AssistantSpecialistRunner {
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

export function buildGraph(
	models: BaseChatModel | NodeModelMap,
	retriever?: RagRetriever,
	logger?: LoggerService
) {
	const m = models as unknown as AssistantSpecialistModels;

	logger?.info(LOG_SOURCE, 'Building assistant graph', {
		hasRetriever: retriever !== undefined,
		specialistCount: Object.keys(ASSISTANT_SPECIALIST).length,
	});

	return new StateGraph(AssistantState)
		.addNode(
			ASSISTANT_SPECIALIST.INTENT_DETECTOR,
			withSpecialistLogging(ASSISTANT_SPECIALIST.INTENT_DETECTOR, logger, (state) =>
				intentDetectorAgent(state, m[ASSISTANT_SPECIALIST.INTENT_DETECTOR], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.PLANNER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.PLANNER, logger, (state) =>
				plannerAgent(state, m[ASSISTANT_SPECIALIST.PLANNER], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.RAG_AGENT,
			withSpecialistLogging(ASSISTANT_SPECIALIST.RAG_AGENT, logger, (state) =>
				ragAgent(state, m[ASSISTANT_SPECIALIST.RAG_AGENT], retriever, logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH,
			withSpecialistLogging(ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH, logger, (state) =>
				duckDuckGoSearchAgent(state, m[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.TEXT_GENERATOR,
			withSpecialistLogging(ASSISTANT_SPECIALIST.TEXT_GENERATOR, logger, (state) =>
				textGeneratorAgent(state, m[ASSISTANT_SPECIALIST.TEXT_GENERATOR], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.ANALYZER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.ANALYZER, logger, (state) =>
				analyzerAgent(state, m[ASSISTANT_SPECIALIST.ANALYZER], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.ENHANCER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.ENHANCER, logger, (state) =>
				enhancerAgent(state, m[ASSISTANT_SPECIALIST.ENHANCER], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.IMAGE_PROMPT_ENHANCER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.IMAGE_PROMPT_ENHANCER, logger, (state) =>
				imagePromptEnhancerAgent(
					state,
					m[ASSISTANT_SPECIALIST.IMAGE_PROMPT_ENHANCER],
					logger
				)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.IMAGE_GENERATOR,
			withSpecialistLogging(ASSISTANT_SPECIALIST.IMAGE_GENERATOR, logger, (state) =>
				imageGeneratorAgent(state, m[ASSISTANT_SPECIALIST.IMAGE_GENERATOR], logger)
			)
		)
		.addEdge(START, ASSISTANT_SPECIALIST.INTENT_DETECTOR)
		.addConditionalEdges(ASSISTANT_SPECIALIST.INTENT_DETECTOR, routeAfterIntent, {
			image_branch: ASSISTANT_SPECIALIST.IMAGE_PROMPT_ENHANCER,
			text_branch: ASSISTANT_SPECIALIST.PLANNER,
		})
		.addEdge(
			ASSISTANT_SPECIALIST.IMAGE_PROMPT_ENHANCER,
			ASSISTANT_SPECIALIST.IMAGE_GENERATOR
		)
		.addEdge(ASSISTANT_SPECIALIST.IMAGE_GENERATOR, END)
		.addEdge(ASSISTANT_SPECIALIST.PLANNER, ASSISTANT_SPECIALIST.RAG_AGENT)
		.addEdge(ASSISTANT_SPECIALIST.PLANNER, ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH)
		.addEdge(ASSISTANT_SPECIALIST.PLANNER, ASSISTANT_SPECIALIST.TEXT_GENERATOR)
		.addEdge(
			[
				ASSISTANT_SPECIALIST.RAG_AGENT,
				ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH,
				ASSISTANT_SPECIALIST.TEXT_GENERATOR,
			],
			ASSISTANT_SPECIALIST.ANALYZER
		)
		.addConditionalEdges(ASSISTANT_SPECIALIST.ANALYZER, routeAfterAnalysis, {
			retry: ASSISTANT_SPECIALIST.PLANNER,
			enhance: ASSISTANT_SPECIALIST.ENHANCER,
		})
		.addEdge(ASSISTANT_SPECIALIST.ENHANCER, END)
		.compile();
}
