import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import type { LoggerService } from '../../services/logger';
import { AssistantState } from './state';
import { aggregateNode } from './nodes/aggregate/aggregate-node';
import { imageGenerationNode } from './nodes/image_generation/image-generation-node';
import { intentClassificationNode } from './nodes/intent_classification/intent-classification-node';
import { ragQueryNode } from './nodes/rag/rag-node';
import { textGenerationNode } from './nodes/text_generation/text-generation-node';
import type { RagRetriever } from './nodes/rag/rag-retriever';

const LOG_SOURCE = 'AssistantGraph';

export const ASSISTANT_NODE = {
	INTENT_CLASSIFICATION: 'intent_classification',
	TEXT_GENERATION: 'text_generation',
	RAG_QUERY: 'rag_query',
	IMAGE_GENERATION: 'image_generation',
	AGGREGATE: 'aggregate',
} as const;

export interface AssistantNodeModels {
	[ASSISTANT_NODE.INTENT_CLASSIFICATION]: BaseChatModel;
	[ASSISTANT_NODE.TEXT_GENERATION]: BaseChatModel;
	[ASSISTANT_NODE.RAG_QUERY]: BaseChatModel;
	[ASSISTANT_NODE.IMAGE_GENERATION]: BaseChatModel;
	[ASSISTANT_NODE.AGGREGATE]: BaseChatModel;
}

type AssistantNodeName = (typeof ASSISTANT_NODE)[keyof typeof ASSISTANT_NODE];
type AssistantGraphState = typeof AssistantState.State;
type AssistantNodeResult = Partial<AssistantGraphState>;
type AssistantNodeRunner = (state: AssistantGraphState) => Promise<AssistantNodeResult>;

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
			ASSISTANT_NODE.INTENT_CLASSIFICATION,
			withNodeLogging(ASSISTANT_NODE.INTENT_CLASSIFICATION, logger, (state) =>
				intentClassificationNode(state, m[ASSISTANT_NODE.INTENT_CLASSIFICATION], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.TEXT_GENERATION,
			withNodeLogging(ASSISTANT_NODE.TEXT_GENERATION, logger, (state) =>
				textGenerationNode(state, m[ASSISTANT_NODE.TEXT_GENERATION], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.RAG_QUERY,
			withNodeLogging(ASSISTANT_NODE.RAG_QUERY, logger, (state) =>
				ragQueryNode(state, m[ASSISTANT_NODE.RAG_QUERY], retriever, logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.IMAGE_GENERATION,
			withNodeLogging(ASSISTANT_NODE.IMAGE_GENERATION, logger, (state) =>
				imageGenerationNode(state, m[ASSISTANT_NODE.IMAGE_GENERATION], logger)
			)
		)
		.addNode(
			ASSISTANT_NODE.AGGREGATE,
			withNodeLogging(ASSISTANT_NODE.AGGREGATE, logger, (state) =>
				aggregateNode(state, m[ASSISTANT_NODE.AGGREGATE], logger)
			)
		)
		.addEdge(START, ASSISTANT_NODE.INTENT_CLASSIFICATION)
		.addEdge(ASSISTANT_NODE.INTENT_CLASSIFICATION, ASSISTANT_NODE.TEXT_GENERATION)
		.addEdge(ASSISTANT_NODE.INTENT_CLASSIFICATION, ASSISTANT_NODE.RAG_QUERY)
		.addEdge(ASSISTANT_NODE.INTENT_CLASSIFICATION, ASSISTANT_NODE.IMAGE_GENERATION)
		.addEdge(
			[
				ASSISTANT_NODE.TEXT_GENERATION,
				ASSISTANT_NODE.RAG_QUERY,
				ASSISTANT_NODE.IMAGE_GENERATION,
			],
			ASSISTANT_NODE.AGGREGATE
		)
		.addEdge(ASSISTANT_NODE.AGGREGATE, END)
		.compile();
}
