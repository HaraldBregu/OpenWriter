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
			new SystemMessage(
				`[CONTEXT BLOCK]
You are continuing a piece of writing. Your job is to insert new content at the marked position — not rewrite, not summarize, just continue naturally.

Before you write, silently analyze the surrounding text for:
- Vocabulary level, sentence length, and rhythm
- Tense, person, and voice (active/passive)
- Tone and register
- How the text before the marker ends and the text after begins
Then match all of these in your output.

[DOCUMENT BLOCK]
Here is the full document. The exact insertion point is marked with ${INSERT_MARKER}:

---
${before}

${INSERT_MARKER}

${after}
---

[TASK BLOCK]
Write the continuation that fits at ${INSERT_MARKER}.

Requirements:
- Match the tone, voice, and style of the surrounding text
- Connect smoothly to the sentence/paragraph before AND after the marker
- Do NOT repeat the existing text
- Do NOT add a title, heading, or commentary — output only the insertion text
- Do NOT wrap your response in quotes, markdown, or code fences
- If the marker falls mid-sentence, complete that sentence first before adding new content
- Produce coherent prose that reads as if it was always part of the document`
			),
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
