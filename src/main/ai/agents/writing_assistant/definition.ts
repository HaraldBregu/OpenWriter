/**
 * WritingAssistant — continues writing from the end of provided text.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → continue_writing → END
 *
 * The node receives the input text, streams it through the injected model,
 * and returns only the continuation — no JSON, no commentary.
 *
 * Execution contract: custom-state protocol.
 *   - `buildGraphInput` maps executor context → WriterState initial fields.
 *   - `extractGraphOutput` pulls `state.completion` from the final snapshot.
 *   - `streamMode: ['messages', 'values']` enables token-level streaming.
 */

import type { AgentDefinition, GraphInputContext, NodeRoleMap } from '../../core/definition';
import { buildGraph } from './graph';

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

const definition: AgentDefinition = {
	id: 'writing-assistant',
	name: 'Writing Assistant',
	category: 'writing',
	role: 'completer',
	buildGraph,

	/**
	 * Map executor-resolved context to WriterState initial fields.
	 *
	 * `prompt` carries the input text. The model is injected via closure
	 * in buildGraph, so `apiKey`/`modelName`/`providerId` are only kept
	 * in state for backward compatibility.
	 */
	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			type: 'continue_writing',
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

export { definition as WritingAssistantAgent };
