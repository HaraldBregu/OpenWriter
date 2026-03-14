/**
 * LangGraph definition for the Text Writer agent.
 *
 * Topology:
 *
 *   START → write → END
 *
 * Single-node graph — writes new text from a given prompt.
 *
 * Node implementation lives in write-node.ts.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TextWriterState } from './state';
import type { NodeModelMap } from '../../core/definition';
import { writeNode } from './write-node';

const NODE = {
	WRITE: 'write',
} as const;

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as NodeModelMap;
	const graph = new StateGraph(TextWriterState)
		.addNode(NODE.WRITE, (state: typeof TextWriterState.State) => writeNode(state, m[NODE.WRITE]))
		.addEdge(START, NODE.WRITE)
		.addEdge(NODE.WRITE, END);

	return graph.compile();
}
