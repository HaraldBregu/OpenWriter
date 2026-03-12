/**
 * TextContinuation — inserts new content at a specific position within existing text.
 *
 * Unlike TextCompleter (which appends to the end), this agent receives the full
 * document split around a marked insertion point (<<INSERT_HERE>>) and generates
 * content that connects smoothly to both the preceding and following text.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → continue_writing → END
 *
 * The node splits the document at the marker, embeds the preceding half into a
 * rich system prompt with inline style-matching instructions, and returns only
 * the insertion text — no JSON, no commentary.
 *
 * Execution contract: custom-state protocol.
 *   - `buildGraphInput` maps executor context → WriterState initial fields.
 *   - `extractGraphOutput` pulls `state.completion` from the final snapshot.
 *   - `streamMode: 'values'` is used; a single `done` event is emitted.
 *
 * Expected prompt format (built by the caller):
 *   The prompt must contain the full document with <<INSERT_HERE>> at the
 *   insertion point. The node handles marker splitting internally.
 */

import type { AgentDefinition, GraphInputContext } from '../../core/definition';
import { buildGraph } from './graph';

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
	buildGraph,

	/**
	 * Map executor-resolved context to WriterState initial fields.
	 *
	 * `prompt` carries the full document text (including the <<INSERT_HERE>>
	 * marker when present). The node resolves the actual content to send to
	 * the model, so we store the raw prompt in `inputText` and leave `content`
	 * empty — the node handles the split.
	 *
	 * `apiKey` and `modelName` are threaded through state so the node can
	 * instantiate the LLM without hardcoding provider details.
	 */
	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			inputText: ctx.prompt,
			type: 'continue_writing',
			content: '',
			contentLength: 'short',
			completion: '',
			apiKey: ctx.apiKey,
			modelName: ctx.modelName,
			providerId: ctx.providerId,
		};
	},

	/**
	 * Extract the generated continuation text from the final graph state.
	 * WriterState stores the LLM output in the `completion` field.
	 */
	extractGraphOutput(state: Record<string, unknown>): string {
		return typeof state['completion'] === 'string' ? state['completion'] : '';
	},
};

export { definition as TextContinuationAgent };
