/**
 * LangGraph definition for the TextContinuation agent.
 *
 * Topology:  START → generate_insertion → END
 *
 * Node implementations live in nodes.ts.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { GraphState } from './state';
import { makeGenerateInsertionNode } from './nodes';

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
