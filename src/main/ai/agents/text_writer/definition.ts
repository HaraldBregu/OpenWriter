/**
 * TextWriter — writes new text from a given prompt.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → write → END
 *
 * The node receives the prompt, streams it through the injected model,
 * and returns only the generated text — no JSON, no commentary.
 *
 * Execution contract: custom-state protocol.
 *   - `buildGraphInput` maps executor context → TextWriterState initial fields.
 *   - `extractGraphOutput` pulls `state.completion` from the final snapshot.
 *   - `streamMode: ['messages', 'values']` enables token-level streaming.
 */

import type { AgentDefinition, GraphInputContext } from '../../core/definition';
import { buildGraph } from './graph';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	write: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 4096 },
};

const definition: AgentDefinition = {
	id: 'text-writer',
	name: 'Text Writer',
	category: 'writing',
	nodeModels: NODE_MODELS,
	streamableNodes: ['write'],
	buildGraph,

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			history: ctx.history,
			completion: '',
			apiKey: ctx.apiKey,
			modelName: ctx.modelName,
			providerId: ctx.providerId,
		};
	},

	extractGraphOutput(state: Record<string, unknown>): string {
		return typeof state['completion'] === 'string' ? state['completion'] : '';
	},
};

export { definition as TextWriterAgent };
