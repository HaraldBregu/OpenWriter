/**
 * Graph nodes for the TextContinuation agent.
 *
 * Each exported factory receives the LLM model and returns a LangGraph-compatible
 * node function.  Keeping nodes in their own file makes the graph definition
 * (graph.ts) a pure wiring concern.
 */

import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { TextContinuationState } from './state';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSERT_MARKER = '<<INSERT_HERE>>';

const systemPromptBase = new SystemMessage(`
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
`);

const shortContinuationPrompt = new SystemMessage(`
# Length constraint
Write a maximum of 10–15 words to continue the text. Be concise and precise.
`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the raw user text from the LangGraph message list. */
function extractUserText(state: TextContinuationState): string {
	const userMsg = state.messages.find(
		(m) => 'getType' in m && typeof m.getType === 'function' && m.getType() === 'human'
	) as HumanMessage | undefined;
	return userMsg ? String(userMsg.content) : '';
}

/** Split the user prompt around the <<INSERT_HERE>> marker. */
function splitAtMarker(text: string): { before: string; after: string } {
	const idx = text.indexOf(INSERT_MARKER);
	if (idx === -1) {
		return { before: text.trim(), after: '' };
	}
	return {
		before: text.slice(0, idx).trim(),
		after: text.slice(idx + INSERT_MARKER.length).trim(),
	};
}

// ---------------------------------------------------------------------------
// Node: generate_insertion
// ---------------------------------------------------------------------------

/**
 * Splits the document at the marker, builds a self-contained prompt, and
 * returns only the final insertion prose.
 */
export function makeGenerateInsertionNode(model: BaseChatModel) {
	return async (state: TextContinuationState): Promise<Partial<TextContinuationState>> => {

		const userText = extractUserText(state);
		const { before, after } = splitAtMarker(userText);

		const generationMessages = [
			systemPromptBase,
			shortContinuationPrompt,
			new HumanMessage(
				'Generate the insertion text now. Output ONLY the prose to be placed at the insertion point — nothing else.'
			),
		];

		const response = await model.invoke(generationMessages);
		const insertion = typeof response.content === 'string' ? response.content : '';

		return {
			insertion,
			messages: [new AIMessage(insertion)],
		};
	};
}
