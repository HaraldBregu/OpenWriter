/**
 * TextContinuation — inserts new content at a specific position within existing text.
 *
 * Unlike TextCompleter (which appends to the end), this agent receives the full
 * document split around a marked insertion point (<<INSERT_HERE>>) and generates
 * content that connects smoothly to both the preceding and following text.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → generate_insertion → END
 *
 * The node splits the document at the marker, embeds both halves into a rich
 * system prompt with inline style-matching instructions, and streams only the
 * final insertion text — no JSON, no commentary.
 *
 * Expected prompt format (built by the caller):
 *   The prompt must contain the full document with <<INSERT_HERE>> at the
 *   insertion point, plus optional constraints (word count, topic, perspective).
 */

import type { AgentDefinition } from '../../core/definition';
import { buildGraph } from './graph';

// ---------------------------------------------------------------------------
// System prompt (used as fallback by AgentExecutor plain-chat path)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `[CONTEXT BLOCK]
You are continuing a piece of writing. Your job is to insert new content at the marked position — not rewrite, not summarize, just continue naturally.

[TASK BLOCK]
Write the continuation that fits at <<INSERT_HERE>>.

Requirements:
- Match the tone, voice, and style of the surrounding text
- Connect smoothly to the sentence/paragraph before AND after the marker
- Do NOT repeat the existing text
- Do NOT add a title, heading, or commentary — output only the insertion text
- Do NOT wrap your response in quotes, markdown, or code fences
- If the marker falls mid-sentence, complete that sentence first before adding new content
- Produce coherent prose that reads as if it was always part of the document`;

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
	id: 'text-continuation',
	name: 'Writer Assistant',
	description:
		'Inserts new content at a specific position within existing text, matching the surrounding tone, voice, and style while connecting smoothly to both the preceding and following context.',
	category: 'writing',
	role: 'completer',
	defaultConfig: {
		systemPrompt: SYSTEM_PROMPT,
		temperature: 0.4,
		maxHistoryMessages: 4,
	},
	inputHints: {
		label: 'Document with insertion point',
		placeholder:
			'Paste your full text with <<INSERT_HERE>> at the insertion point, followed by any constraints (word count, topic, perspective)…',
		multiline: true,
	},
	buildGraph,
};

export { definition as TextContinuationAgent };
