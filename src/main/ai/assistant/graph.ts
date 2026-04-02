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

export function buildGraph(
	models: BaseChatModel | NodeModelMap,
	retriever?: RagRetriever,
	logger?: LoggerService
) {
	const m = models as unknown as AssistantNodeModels;

	return new StateGraph(AssistantState)
		.addNode(ASSISTANT_NODE.INTENT_CLASSIFICATION, (state: typeof AssistantState.State) =>
			intentClassificationNode(state, m[ASSISTANT_NODE.INTENT_CLASSIFICATION], logger)
		)
		.addNode(ASSISTANT_NODE.TEXT_GENERATION, (state: typeof AssistantState.State) =>
			textGenerationNode(state, m[ASSISTANT_NODE.TEXT_GENERATION], logger)
		)
		.addNode(ASSISTANT_NODE.RAG_QUERY, (state: typeof AssistantState.State) =>
			ragQueryNode(state, m[ASSISTANT_NODE.RAG_QUERY], retriever, logger)
		)
		.addNode(ASSISTANT_NODE.IMAGE_GENERATION, (state: typeof AssistantState.State) =>
			imageGenerationNode(state, m[ASSISTANT_NODE.IMAGE_GENERATION], logger)
		)
		.addNode(ASSISTANT_NODE.AGGREGATE, (state: typeof AssistantState.State) =>
			aggregateNode(state, m[ASSISTANT_NODE.AGGREGATE], logger)
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
