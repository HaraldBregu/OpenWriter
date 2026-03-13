/**
 * Intent classification node for the Writing Assistant agent.
 *
 * Uses model.invoke() (not stream) because it only needs a single classification
 * token — "enhance" or "continue_writing" — before the graph routes downstream.
 *
 * The model is injected via closure from graph.ts.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { WriterIntent } from '../../state';
import { WriterState } from '../../state';
import SYSTEM_PROMPT from './SYSTEM.md?raw';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_INTENTS = new Set<WriterIntent>(['enhance', 'continue_writing']);
const FALLBACK_INTENT: WriterIntent = 'continue_writing';

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export async function node(
	state: typeof WriterState.State,
	model: BaseChatModel
): Promise<Partial<typeof WriterState.State>> {
	const messages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(state.prompt)];

	const response = await model.invoke(messages);

	const raw = typeof response.content === 'string' ? response.content.trim().toLowerCase() : '';

	const intent: WriterIntent = VALID_INTENTS.has(raw as WriterIntent)
		? (raw as WriterIntent)
		: FALLBACK_INTENT;

	return { intent };
}
