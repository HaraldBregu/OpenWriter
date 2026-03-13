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

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { extractTokenFromChunk } from '../../../../../shared/ai-utils';
import type { WriterState } from '../../state';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a writing continuation assistant.

# Role

Your sole function is to extend the user's text seamlessly from the exact point it ends — whether that point is mid-word, mid-sentence, or after a complete sentence.

# How to continue

- Text ends mid-word (e.g. "Lorem ipsum dol") → complete the word, then continue the sentence and paragraph naturally.
- Text ends mid-sentence (e.g. "Lorem ipsum dolor sit amet, consectetur") → complete the sentence, then continue writing.
- Text ends after a complete sentence (e.g. "Lorem ipsum dolor sit amet, consectetur adipiscing elit.") → write new sentences that follow naturally in content and structure.

# Style and tone

- Mirror the exact tone, voice, register, and pacing of the input — without exception.
- Formal text stays formal. Casual text stays casual. Do not drift.
- Continue in the same language as the input. If the text is in Italian, continue in Italian. If in English, continue in English.
- Do not shift vocabulary level, narrative perspective, or sentence rhythm.

# Output rules

- Never repeat or echo any portion of the input text.
- Output only the continuation — no titles, headers, labels, or meta-commentary.
- Do not describe, explain, or announce what you are doing.
- Begin your response at the precise character position where the input ends.
- If the input text contains an inline instruction enclosed between two ⬢ characters (e.g. ⬢ instruction ⬢), follow that instruction precisely while continuing the text. Remove the ⬢ markers and the instruction itself from the output — only produce the continuation that satisfies the instruction.
`;

const SHORT_CONTINUATION_PROMPT = `
# Length constraint
Write a maximum of 10–15 words to continue the text. Be concise and precise.
`;

const MEDIUM_CONTINUATION_PROMPT = `
# Length constraint
Write a maximum of 25–30 words to continue the text. Provide more detail and depth while staying focused.
`;

const LONG_CONTINUATION_PROMPT = `
# Length constraint
Write a maximum of 50–60 words to continue the text. Provide rich detail, depth, and nuance while staying focused.
`;

const LENGTH_PROMPTS: Record<string, string> = {
	short: SHORT_CONTINUATION_PROMPT,
	medium: MEDIUM_CONTINUATION_PROMPT,
	long: LONG_CONTINUATION_PROMPT,
};

// ---------------------------------------------------------------------------
// Node: continue_writing
// ---------------------------------------------------------------------------

export async function continueWriting(
	state: typeof WriterState.State,
	model: BaseChatModel
): Promise<Partial<typeof WriterState.State>> {
	const content = state.prompt;

	const messages: BaseMessage[] = [
		new SystemMessage(SYSTEM_PROMPT),
		new SystemMessage(LENGTH_PROMPTS[state.contentLength] ?? SHORT_CONTINUATION_PROMPT),
		new HumanMessage(content),
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
