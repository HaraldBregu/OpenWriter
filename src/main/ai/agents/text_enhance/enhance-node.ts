/**
 * Enhance node for the Text Enhance agent.
 *
 * Streams the enhanced version of the user's text through the injected model.
 * The model is injected via closure from graph.ts — this node never constructs
 * or configures LLM instances directly.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../shared/ai-utils';
import type { TextEnhanceState } from './state';
import SYSTEM_PROMPT from './ENHANCE_SYSTEM.md?raw';

export async function enhanceNode(
	state: typeof TextEnhanceState.State,
	model: BaseChatModel
): Promise<Partial<typeof TextEnhanceState.State>> {
	const messages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(state.prompt)];

	let completion = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const token = extractTokenFromChunk(chunk.content);
		if (token) {
			completion += token;
		}
	}

	return { completion };
}
