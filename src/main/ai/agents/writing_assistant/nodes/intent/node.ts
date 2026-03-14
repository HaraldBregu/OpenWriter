/**
 * Intent classification node for the Writing Assistant agent.
 *
 * Uses model.invoke() (not stream) because it only needs a single JSON object
 * before the graph routes downstream. The raw LLM output is parsed via
 * `parseWriterIntent`, which is safe — it never throws and always returns a
 * valid `WriterIntentResult`, falling back to `FALLBACK_INTENT` on any error.
 *
 * The model is injected via closure from graph.ts.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { extractTokenFromChunk } from '../../../../../shared/ai-utils';
import { parseWriterIntent, FALLBACK_INTENT } from '../../writer-intent';
import type { WriterIntentResult } from '../../writer-intent';
import { WriterState } from '../../state';
import SYSTEM_PROMPT from './SYSTEM.md?raw';

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export async function node(
	state: typeof WriterState.State,
	model: BaseChatModel
): Promise<Partial<typeof WriterState.State>> {
	const messages = [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(state.prompt)];

	const response = await model.invoke(messages);

	const raw = extractTokenFromChunk(response.content);
	console.log('Raw intent output:', raw);
	console.log('Parsed intent output:', parseWriterIntent(raw));
	console.log('Fallback intent:', FALLBACK_INTENT);
	console.log('Is parsed intent valid?', response.content);
	const intent: WriterIntentResult = raw.length > 0 ? parseWriterIntent(raw) : FALLBACK_INTENT;

	return { intent };
}
