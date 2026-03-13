/**
 * Text enhancement node for the Writing Assistant agent.
 *
 * Streams the enhanced version of the user's text through the injected model.
 * The model is injected via closure from graph.ts — this node never constructs
 * or configures LLM instances directly.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../../../shared/ai-utils';
import { WriterState } from '../../state';
import SYSTEM_PROMPT from './SYSTEM.md?raw';

export async function node(
	state: typeof WriterState.State,
	model: BaseChatModel
): Promise<Partial<typeof WriterState.State>> {
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
