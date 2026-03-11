/**
 * LangGraph definition for the Writer Assistant agent.
 *
 * Topology:  START → continue_writing → END
 *
 * Node implementations live in nodes.ts.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { WriterState } from './state';
import { continueWritingNode } from './nodes';

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

export function buildGraph(_model: BaseChatModel) {
	const graph = new StateGraph(WriterState)
		.addNode('continue_writing', continueWritingNode)
		.addEdge(START, 'continue_writing')
		.addEdge('continue_writing', END);

	return graph.compile();
}
