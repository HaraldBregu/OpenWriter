/**
 * LangGraph definition for the Text Enhance agent.
 *
 * Topology:
 *
 *   START → enhance_text → END
 *
 * Single-node graph — no intent classification needed since this agent
 * only handles text enhancement.
 *
 * Node implementation lives in nodes/.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TextEnhanceState } from './state';
import type { NodeModelMap } from '../../core/definition';
import { enhanceText } from './nodes';

const NODE = {
	ENHANCE_TEXT: 'enhance_text',
} as const;

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as NodeModelMap;
	const graph = new StateGraph(TextEnhanceState)
		.addNode(NODE.ENHANCE_TEXT, (state: typeof TextEnhanceState.State) =>
			enhanceText(state, m[NODE.ENHANCE_TEXT])
		)
		.addEdge(START, NODE.ENHANCE_TEXT)
		.addEdge(NODE.ENHANCE_TEXT, END);

	return graph.compile();
}
