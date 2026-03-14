/**
 * Write node for the Text Completer agent.
 *
 * Streams the continuation of the user's text through the injected model.
 * The model is injected via closure from graph.ts — this node never constructs
 * or configures LLM instances directly.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../shared/ai-utils';
import type { TextCompleterState } from './state';
import SYSTEM_PROMPT from './WRITE_SYSTEM.md?raw';

export async function writeNode(
	state: typeof TextCompleterState.State,
	model: BaseChatModel
): Promise<Partial<typeof TextCompleterState.State>> {
	const messages: BaseMessage[] = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(state.prompt),
	];

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
