/**
 * LangGraph definition for the Painter agent.
 *
 * Topology:
 *
 *   START → refine-prompt → generate-image → END
 *
 * Node responsibilities:
 *   - `refine-prompt`  — LLM node. Rewrites the user's raw description into an
 *                        optimised DALL-E 3 prompt. Streams tokens to the caller.
 *   - `generate-image` — API node. Calls DALL-E 3 via the OpenAI SDK and writes
 *                        the image URL and revised prompt to state. No streaming.
 *
 * The `refine-prompt` node receives a resolved `BaseChatModel` instance from
 * `nodeModels` (keyed by node name). The `generate-image` node reads the API key
 * directly from state — it does not use a chat model.
 *
 * Node implementations live in refine-prompt-node.ts and generate-image-node.ts.
 * State annotation lives in state.ts.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ImageGeneratorState } from './state';
import type { NodeModelMap } from '../../core/definition';
import { refinePromptNode } from './refine-prompt-node';
import { generateImageNode } from './generate-image-node';

const NODE = {
	REFINE_PROMPT: 'refine-prompt',
	GENERATE_IMAGE: 'generate-image',
} as const;

export function buildGraph(models: BaseChatModel | NodeModelMap) {
	const m = models as NodeModelMap;

	const graph = new StateGraph(ImageGeneratorState)
		.addNode(NODE.REFINE_PROMPT, (state: typeof ImageGeneratorState.State) =>
			refinePromptNode(state, m[NODE.REFINE_PROMPT])
		)
		.addNode(NODE.GENERATE_IMAGE, (state: typeof ImageGeneratorState.State) =>
			generateImageNode(state)
		)
		.addEdge(START, NODE.REFINE_PROMPT)
		.addEdge(NODE.REFINE_PROMPT, NODE.GENERATE_IMAGE)
		.addEdge(NODE.GENERATE_IMAGE, END);

	return graph.compile();
}
