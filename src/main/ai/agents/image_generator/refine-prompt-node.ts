/**
 * Refine-prompt node for the Image Generator agent.
 *
 * Uses the injected LLM to rewrite the user's raw image description into a
 * high-quality DALL-E 3 prompt. The refined text is stored in `refinedPrompt`
 * and consumed by the downstream `generate-image` node.
 *
 * The model is injected via closure from graph.ts — this node never constructs
 * or configures LLM instances directly.
 *
 * Streaming behaviour: the node streams tokens through the model, which allows
 * the executor to forward them to the caller in real-time. The executor only
 * forwards tokens from nodes listed in `streamableNodes`, so the caller sees
 * the refined prompt text appear progressively.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../shared/ai-utils';
import type { ImageGeneratorState } from './state';
import SYSTEM_PROMPT from './REFINE_PROMPT_SYSTEM.md?raw';

export async function refinePromptNode(
	state: typeof ImageGeneratorState.State,
	model: BaseChatModel
): Promise<Partial<typeof ImageGeneratorState.State>> {
	const messages: BaseMessage[] = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(state.prompt),
	];

	let refinedPrompt = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			refinedPrompt += token;
		}
	}

	return { refinedPrompt };
}
