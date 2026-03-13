/**
 * Graph nodes for the Writing Assistant agent.
 *
 * Each exported node function receives the current graph state and returns
 * a partial state update. Keeping nodes in their own file makes the graph
 * definition (graph.ts) a pure wiring concern.
 *
 * The model is injected via closure from graph.ts — nodes never construct
 * or configure LLM instances directly.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { extractTokenFromChunk } from '../../../../../shared/ai-utils';
import type { WriterState } from '../../state';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

const SYSTEM_PROMPT = readFileSync(join(__dirname, 'SYSTEM.md'), 'utf-8');

export async function continueWriting(
	state: typeof WriterState.State,
	model: BaseChatModel
): Promise<Partial<typeof WriterState.State>> {
	const content = state.prompt;

	const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(content)];

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
