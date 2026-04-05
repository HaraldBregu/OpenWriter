import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import { AssistantState } from './state';
import { analyzerAgent, createAnalyzerAgent } from './agents/analyzer-agent';
import {
	createDuckDuckGoSearchAgent,
	duckDuckGoSearchAgent,
} from './agents/duckduckgo-search-agent';
import { createEnhancerAgent, enhancerAgent } from './agents/enhancer-agent';
import { createIntentDetectorAgent, intentDetectorAgent } from './agents/intent-detector-agent';
import { createPlannerAgent, plannerAgent } from './agents/planner-agent';
import { createRagAgent, ragAgent } from './agents/rag-agent';
import { createTextGeneratorAgent, textGeneratorAgent } from './agents/text-generator-agent';
import type { RagRetriever } from './agents/rag-retriever';

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
} as const;

export interface AssistantSpecialistModels {
	[ASSISTANT_SPECIALIST.INTENT_DETECTOR]: BaseChatModel;
	[ASSISTANT_SPECIALIST.PLANNER]: BaseChatModel;
	[ASSISTANT_SPECIALIST.RAG_AGENT]: BaseChatModel;
	[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH]: BaseChatModel;
	[ASSISTANT_SPECIALIST.TEXT_GENERATOR]: BaseChatModel;
	[ASSISTANT_SPECIALIST.ANALYZER]: BaseChatModel;
	[ASSISTANT_SPECIALIST.ENHANCER]: BaseChatModel;
}

type AssistantSpecialistName = (typeof ASSISTANT_SPECIALIST)[keyof typeof ASSISTANT_SPECIALIST];
type AssistantGraphState = typeof AssistantState.State;
type AssistantSpecialistResult = Partial<AssistantGraphState>;
type AssistantSpecialistRunner = (state: AssistantGraphState) => Promise<AssistantSpecialistResult>;

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
	const specialists = {
		[ASSISTANT_SPECIALIST.INTENT_DETECTOR]: createIntentDetectorAgent(
			m[ASSISTANT_SPECIALIST.INTENT_DETECTOR]
		),
		[ASSISTANT_SPECIALIST.PLANNER]: createPlannerAgent(m[ASSISTANT_SPECIALIST.PLANNER]),
		[ASSISTANT_SPECIALIST.RAG_AGENT]: createRagAgent(m[ASSISTANT_SPECIALIST.RAG_AGENT]),
		[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH]: createDuckDuckGoSearchAgent(
			m[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH]
		),
		[ASSISTANT_SPECIALIST.TEXT_GENERATOR]: createTextGeneratorAgent(
			m[ASSISTANT_SPECIALIST.TEXT_GENERATOR]
		),
		[ASSISTANT_SPECIALIST.ANALYZER]: createAnalyzerAgent(m[ASSISTANT_SPECIALIST.ANALYZER]),
		[ASSISTANT_SPECIALIST.ENHANCER]: createEnhancerAgent(m[ASSISTANT_SPECIALIST.ENHANCER]),
	};

	logger?.info(LOG_SOURCE, 'Building assistant graph', {
		hasRetriever: retriever !== undefined,
		specialistCount: Object.keys(ASSISTANT_SPECIALIST).length,
	});

	return new StateGraph(AssistantState)
		.addNode(
			ASSISTANT_SPECIALIST.INTENT_DETECTOR,
			withSpecialistLogging(ASSISTANT_SPECIALIST.INTENT_DETECTOR, logger, (state) =>
				intentDetectorAgent(state, specialists[ASSISTANT_SPECIALIST.INTENT_DETECTOR], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.PLANNER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.PLANNER, logger, (state) =>
				plannerAgent(state, specialists[ASSISTANT_SPECIALIST.PLANNER], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.RAG_AGENT,
			withSpecialistLogging(ASSISTANT_SPECIALIST.RAG_AGENT, logger, (state) =>
				ragAgent(state, specialists[ASSISTANT_SPECIALIST.RAG_AGENT], retriever, logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH,
			withSpecialistLogging(ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH, logger, (state) =>
				duckDuckGoSearchAgent(state, specialists[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.TEXT_GENERATOR,
			withSpecialistLogging(ASSISTANT_SPECIALIST.TEXT_GENERATOR, logger, (state) =>
				textGeneratorAgent(state, specialists[ASSISTANT_SPECIALIST.TEXT_GENERATOR], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.ANALYZER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.ANALYZER, logger, (state) =>
				analyzerAgent(state, specialists[ASSISTANT_SPECIALIST.ANALYZER], logger)
			)
		)
		.addNode(
			ASSISTANT_SPECIALIST.ENHANCER,
			withSpecialistLogging(ASSISTANT_SPECIALIST.ENHANCER, logger, (state) =>
				enhancerAgent(state, specialists[ASSISTANT_SPECIALIST.ENHANCER], logger)
			)
		)
		.addEdge(START, ASSISTANT_SPECIALIST.INTENT_DETECTOR)
		.addEdge(ASSISTANT_SPECIALIST.INTENT_DETECTOR, ASSISTANT_SPECIALIST.PLANNER)
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
