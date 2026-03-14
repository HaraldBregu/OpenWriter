/**
 * LangGraph definition for the Text Writer agent.
 *
 * Topology:
 *
 *   START → write → END
 *
 * Single-node graph — continues writing from the end of provided text.
 *
 * Node implementation lives in nodes/.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TextWriterState } from './state';
import type { NodeModelMap } from '../../core/definition';
import { write } from './nodes';

const NODE = {
	WRITE: 'write',
} as const;

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as NodeModelMap;
	const graph = new StateGraph(TextWriterState)
		.addNode(NODE.WRITE, (state: typeof TextWriterState.State) => write(state, m[NODE.WRITE]))
		.addEdge(START, NODE.WRITE)
		.addEdge(NODE.WRITE, END);

	return graph.compile();
}
