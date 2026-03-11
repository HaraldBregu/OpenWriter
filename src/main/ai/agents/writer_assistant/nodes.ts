/**
 * Graph nodes for the Writer Assistant agent.
 *
 * Each exported node function receives the current graph state and returns
 * a partial state update. Keeping nodes in their own file makes the graph
 * definition (graph.ts) a pure wiring concern.
 */

import { ChatOpenAI } from '@langchain/openai';
import type { WriterState } from './state';

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a writing continuation assistant.

# Role

Your job is to continue writing from where the user's text left off. You receive text and seamlessly extend it — whether the text ends mid-word, mid-sentence, or after a complete sentence.

# How to continue

- The text ends mid-word (e.g. "The tele") → complete the word, finish the sentence, and continue writing.
- The text ends mid-sentence (e.g. "She opened the door and") → finish the sentence and continue writing.
- The text ends with a complete sentence (e.g. "The Roman Empire fell in 476 AD.") → continue writing new sentences that naturally follow.

# Style and tone

- Match the exact tone, voice, style, and pacing of the original text.
- If the text is formal, continue formally. If casual, continue casually.
- Preserve the original language — if the text is in Italian, continue in Italian. If in English, continue in English.
- Do not shift register, vocabulary level, or point of view.

# Output rules

- NEVER repeat or include any part of the input text in your response.
- Do not add titles, headers, labels, or commentary.
- Do not explain what you are doing.
- Your response must start exactly where the input text left off — output only the new continuation, nothing else.
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

export async function continueWritingNode(
	state: typeof WriterState.State
): Promise<Partial<typeof WriterState.State>> {
	const model = new ChatOpenAI({
		model: 'gpt-4o',
		temperature: 0.7,
	});

	const messages: { role: 'system' | 'user'; content: string }[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'system', content: LENGTH_PROMPTS[state.contentLength] ?? SHORT_CONTINUATION_PROMPT },
		{ role: 'user', content: `<content>${state.content}</content>` },
	];

	const response = await model.invoke(messages);
	const completion = typeof response.content === 'string' ? response.content : '';

	return { completion };
}
