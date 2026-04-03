import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import { AssistantState } from './state';
import { analyzerNode } from './nodes/analyzer/analyzer-node';
import { duckDuckGoSearchNode } from './nodes/duckduckgo_search/duckduckgo-search-node';
import { enhancerNode } from './nodes/enhancer/enhancer-node';
import { imageGenerationNode } from './nodes/image_generation/image-generation-node';
import { imagePromptEnhancerNode } from './nodes/image_prompt_enhancer/image-prompt-enhancer-node';
import { intentClassificationNode } from './nodes/intent_classification/intent-classification-node';
import { plannerNode } from './nodes/planner/planner-node';
import { ragQueryNode } from './nodes/rag/rag-node';
import { textGenerationNode } from './nodes/text_generation/text-generation-node';
import type { RagRetriever } from './nodes/rag/rag-retriever';

const LOG_SOURCE = 'AssistantGraph';
const MAX_REVIEW_PASSES = 2;

export const ASSISTANT_NODE = {
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

export interface AssistantNodeModels {
	[ASSISTANT_NODE.INTENT_DETECTOR]: BaseChatModel;
	[ASSISTANT_NODE.PLANNER]: BaseChatModel;
	[ASSISTANT_NODE.RAG_AGENT]: BaseChatModel;
	[ASSISTANT_NODE.DUCKDUCKGO_SEARCH]: BaseChatModel;
	[ASSISTANT_NODE.TEXT_GENERATOR]: BaseChatModel;
	[ASSISTANT_NODE.ANALYZER]: BaseChatModel;
	[ASSISTANT_NODE.ENHANCER]: BaseChatModel;
	[ASSISTANT_NODE.IMAGE_PROMPT_ENHANCER]: BaseChatModel;
	[ASSISTANT_NODE.IMAGE_GENERATOR]: BaseChatModel;
}

type AssistantNodeName = (typeof ASSISTANT_NODE)[keyof typeof ASSISTANT_NODE];
type AssistantGraphState = typeof AssistantState.State;
type AssistantNodeResult = Partial<AssistantGraphState>;
type AssistantNodeRunner = (state: AssistantGraphState) => Promise<AssistantNodeResult>;

function routeAfterIntent(state: AssistantGraphState): 'image_branch' | 'text_branch' {
	return state.route === 'image' ? 'image_branch' : 'text_branch';
}

function routeAfterAnalysis(state: AssistantGraphState): 'retry' | 'enhance' {
	if (state.shouldRetry && state.reviewCount < MAX_REVIEW_PASSES) {
		return 'retry';
	}

	return 'enhance';
}

function withNodeLogging(
	nodeName: AssistantNodeName,
	logger: LoggerService | undefined,
	runNode: AssistantNodeRunner
): AssistantNodeRunner {
	return async (state) => {
		const startedAt = Date.now();

		logger?.debug(LOG_SOURCE, `Entering node ${nodeName}`, {
			phaseLabel: state.phaseLabel,
			promptLength: state.prompt.length,
		});

		try {
			const result = await runNode(state);

			logger?.info(LOG_SOURCE, `Completed node ${nodeName}`, {
				durationMs: Date.now() - startedAt,
				updatedKeys: Object.keys(result),
				nextPhaseLabel:
					typeof result.phaseLabel === 'string' ? result.phaseLabel : state.phaseLabel,
			});

			return result;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger?.error(LOG_SOURCE, `Node ${nodeName} failed: ${message}`, {
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
	const m = models as unknown as AssistantNodeModels;

	logger?.info(LOG_SOURCE, 'Building assistant graph', {
		hasRetriever: retriever !== undefined,
		nodeCount: Object.keys(ASSISTANT_NODE).length,
	});

	return new StateGraph(AssistantState)
		.addNode(
			ASSISTANT_NODE.INTENT_DETECTOR,
			withNodeLogging(ASSISTANT_NODE.INTENT_DETECTOR, logger, (state) =>
				intentClassificationNode(state, m[ASSISTANT_NODE.INTENT_DETECTOR], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.PLANNER,
			withNodeLogging(ASSISTANT_NODE.PLANNER, logger, (state) =>
				plannerNode(state, m[ASSISTANT_NODE.PLANNER], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.RAG_AGENT,
			withNodeLogging(ASSISTANT_NODE.RAG_AGENT, logger, (state) =>
				ragQueryNode(state, m[ASSISTANT_NODE.RAG_AGENT], retriever, logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.DUCKDUCKGO_SEARCH,
			withNodeLogging(ASSISTANT_NODE.DUCKDUCKGO_SEARCH, logger, (state) =>
				duckDuckGoSearchNode(state, m[ASSISTANT_NODE.DUCKDUCKGO_SEARCH], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.TEXT_GENERATOR,
			withNodeLogging(ASSISTANT_NODE.TEXT_GENERATOR, logger, (state) =>
				textGenerationNode(state, m[ASSISTANT_NODE.TEXT_GENERATOR], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.ANALYZER,
			withNodeLogging(ASSISTANT_NODE.ANALYZER, logger, (state) =>
				analyzerNode(state, m[ASSISTANT_NODE.ANALYZER], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.ENHANCER,
			withNodeLogging(ASSISTANT_NODE.ENHANCER, logger, (state) =>
				enhancerNode(state, m[ASSISTANT_NODE.ENHANCER], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.IMAGE_PROMPT_ENHANCER,
			withNodeLogging(ASSISTANT_NODE.IMAGE_PROMPT_ENHANCER, logger, (state) =>
				imagePromptEnhancerNode(state, m[ASSISTANT_NODE.IMAGE_PROMPT_ENHANCER], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.IMAGE_GENERATOR,
			withNodeLogging(ASSISTANT_NODE.IMAGE_GENERATOR, logger, (state) =>
				imageGenerationNode(state, m[ASSISTANT_NODE.IMAGE_GENERATOR], logger)
			)
		)
		.addEdge(START, ASSISTANT_NODE.INTENT_DETECTOR)
		.addConditionalEdges(ASSISTANT_NODE.INTENT_DETECTOR, routeAfterIntent, {
			image_branch: ASSISTANT_NODE.IMAGE_PROMPT_ENHANCER,
			text_branch: ASSISTANT_NODE.PLANNER,
		})
		.addEdge(ASSISTANT_NODE.IMAGE_PROMPT_ENHANCER, ASSISTANT_NODE.IMAGE_GENERATOR)
		.addEdge(ASSISTANT_NODE.IMAGE_GENERATOR, END)
		.addEdge(ASSISTANT_NODE.PLANNER, ASSISTANT_NODE.RAG_AGENT)
		.addEdge(ASSISTANT_NODE.PLANNER, ASSISTANT_NODE.DUCKDUCKGO_SEARCH)
		.addEdge(ASSISTANT_NODE.PLANNER, ASSISTANT_NODE.TEXT_GENERATOR)
		.addEdge(
			[
				ASSISTANT_NODE.RAG_AGENT,
				ASSISTANT_NODE.DUCKDUCKGO_SEARCH,
				ASSISTANT_NODE.TEXT_GENERATOR,
			],
			ASSISTANT_NODE.ANALYZER
		)
		.addConditionalEdges(ASSISTANT_NODE.ANALYZER, routeAfterAnalysis, {
			retry: ASSISTANT_NODE.PLANNER,
			enhance: ASSISTANT_NODE.ENHANCER,
		})
		.addEdge(ASSISTANT_NODE.ENHANCER, END)
		.compile();
}
