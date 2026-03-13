/**
 * LangGraph definition for the Writing Assistant agent.
 *
 * Topology:
 *
 *   START → classify_intent ─┬─ (enhance)           → enhance_text      → END
 *                             └─ (continue_writing)  → continue_writing  → END
 *
 * The intent node classifies the user prompt first; the conditional edge then
 * routes to the appropriate generation node.
 *
 * Node implementations live in nodes/.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { WriterState } from './state';
import type { WriterIntent } from './state';
import type { NodeModelMap } from '../../core/definition';
import { classifyIntent, continueWriting, enhanceText } from './nodes';

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/** Node names used as edge targets — kept as constants to avoid magic strings. */
const NODE = {
	CLASSIFY_INTENT: 'classify_intent',
	CONTINUE_WRITING: 'continue_writing',
	ENHANCE_TEXT: 'enhance_text',
} as const;

type NodeName = (typeof NODE)[keyof typeof NODE];

/**
 * Routes from the intent node to the appropriate generation node based on the
 * classification stored in state.
 */
function routeByIntent(state: typeof WriterState.State): NodeName {
	const intent: WriterIntent | '' = state.intent;
	if (intent === 'enhance') {
		return NODE.ENHANCE_TEXT;
	}
	return NODE.CONTINUE_WRITING;
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

export function buildGraph(model: BaseChatModel) {
	const graph = new StateGraph(WriterState)
		.addNode(NODE.CLASSIFY_INTENT, (state: typeof WriterState.State) =>
			classifyIntent(state, model)
		)
		.addNode(NODE.CONTINUE_WRITING, (state: typeof WriterState.State) =>
			continueWriting(state, model)
		)
		.addNode(NODE.ENHANCE_TEXT, (state: typeof WriterState.State) =>
			enhanceText(state, model)
		)
		.addEdge(START, NODE.CLASSIFY_INTENT)
		.addConditionalEdges(NODE.CLASSIFY_INTENT, routeByIntent, {
			[NODE.CONTINUE_WRITING]: NODE.CONTINUE_WRITING,
			[NODE.ENHANCE_TEXT]: NODE.ENHANCE_TEXT,
		})
		.addEdge(NODE.CONTINUE_WRITING, END)
		.addEdge(NODE.ENHANCE_TEXT, END);

	return graph.compile();
}
