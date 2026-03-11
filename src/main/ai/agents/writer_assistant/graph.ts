/**
 * LangGraph definition for the TextContinuation agent.
 *
 * Topology:  START → generate_insertion → END
 *
 * This file owns the graph state annotation and wiring.
 * Node implementations live in nodes.ts.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { makeGenerateInsertionNode } from './nodes';

// ---------------------------------------------------------------------------
// Graph state
// ---------------------------------------------------------------------------

const GraphState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (existing, update) => existing.concat(update),
		default: () => [],
	}),
	insertion: Annotation<string>({
		reducer: (_, next) => next,
		default: () => '',
	}),
});

export type TextContinuationState = typeof GraphState.State;

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

export function buildTextContinuationGraph(model: BaseChatModel) {
	const graph = new StateGraph(GraphState)
		.addNode('generate_insertion', makeGenerateInsertionNode(model))
		.addEdge(START, 'generate_insertion')
		.addEdge('generate_insertion', END);

	return graph.compile();
}
