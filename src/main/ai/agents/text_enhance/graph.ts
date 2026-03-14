/**
 * LangGraph definition for the Text Enhance agent.
 *
 * Topology:
 *
 *   START → enhance → END
 *
 * Single-node graph — no intent classification needed since this agent
 * only handles text enhancement.
 *
 * Node implementation lives in enhance-node.ts.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TextEnhanceState } from './state';
import type { NodeModelMap } from '../../core/definition';
import { enhanceNode } from './enhance-node';

const NODE = {
	ENHANCE: 'enhance',
} as const;

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as NodeModelMap;
	const graph = new StateGraph(TextEnhanceState)
		.addNode(NODE.ENHANCE, (state: typeof TextEnhanceState.State) =>
			enhanceNode(state, m[NODE.ENHANCE])
		)
		.addEdge(START, NODE.ENHANCE)
		.addEdge(NODE.ENHANCE, END);

	return graph.compile();
}
