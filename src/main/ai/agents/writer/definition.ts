/**
 * Writer — writes text from a given prompt.
 *
 * This agent intentionally reuses the existing text-writer graph and node
 * implementation so the behavior stays aligned while exposing a simpler
 * machine-readable id and display name.
 */

import type { AgentDefinition, GraphInputContext } from '../../core/definition';
import { buildGraph } from './graph';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	write: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 4096 },
};

const definition: AgentDefinition = {
	id: 'writer',
	name: 'Writer',
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

export { definition as WriterAgent };
