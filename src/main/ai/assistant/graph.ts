import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { NodeModelMap } from '../core/definition';
import { AssistantState } from './state';
import { aggregateNode } from './nodes/aggregate/aggregate-node';
import { grammarCheckNode } from './nodes/grammar_check/grammar-check-node';
import { ragQueryNode } from './nodes/rag/rag-node';
import type { RagRetriever } from './nodes/rag/rag-retriever';

export const ASSISTANT_NODE = {
	RAG_QUERY: 'rag_query',
	GRAMMAR_CHECK: 'grammar_check',
	AGGREGATE: 'aggregate',
} as const;

export interface AssistantNodeModels {
	[ASSISTANT_NODE.RAG_QUERY]: BaseChatModel;
	[ASSISTANT_NODE.GRAMMAR_CHECK]: BaseChatModel;
	[ASSISTANT_NODE.AGGREGATE]: BaseChatModel;
}

export function buildGraph(models: BaseChatModel | NodeModelMap, retriever?: RagRetriever) {
	const m = models as unknown as AssistantNodeModels;

	return new StateGraph(AssistantState)
		.addNode(ASSISTANT_NODE.RAG_QUERY, (state: typeof AssistantState.State) =>
			ragQueryNode(state, m[ASSISTANT_NODE.RAG_QUERY], retriever)
		)
		.addNode(ASSISTANT_NODE.GRAMMAR_CHECK, (state: typeof AssistantState.State) =>
			grammarCheckNode(state, m[ASSISTANT_NODE.GRAMMAR_CHECK])
		)
		.addNode(ASSISTANT_NODE.AGGREGATE, (state: typeof AssistantState.State) =>
			aggregateNode(state, m[ASSISTANT_NODE.AGGREGATE])
		)
		.addEdge(START, ASSISTANT_NODE.RAG_QUERY)
		.addEdge(START, ASSISTANT_NODE.GRAMMAR_CHECK)
		.addEdge([ASSISTANT_NODE.RAG_QUERY, ASSISTANT_NODE.GRAMMAR_CHECK], ASSISTANT_NODE.AGGREGATE)
		.addEdge(ASSISTANT_NODE.AGGREGATE, END)
		.compile();
}
