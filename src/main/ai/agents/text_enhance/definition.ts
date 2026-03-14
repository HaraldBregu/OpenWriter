/**
 * TextEnhance — enhances selected text while preserving meaning and voice.
 *
 * Runs as a single-node LangGraph StateGraph:
 *   START → enhance_text → END
 *
 * The node receives the input text, streams the enhanced version through
 * the injected model, and returns the improved text.
 *
 * Execution contract: custom-state protocol.
 *   - `buildGraphInput` maps executor context → TextEnhanceState initial fields.
 *   - `extractGraphOutput` pulls `state.completion` from the final snapshot.
 *   - `streamMode: ['messages', 'values']` enables token-level streaming.
 */

import type { AgentDefinition, GraphInputContext } from '../../core/definition';
import { buildGraph } from './graph';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	enhance_text: { providerId: 'openai', modelId: 'gpt-4o', temperature: 0.4, maxTokens: 2048 },
};

const definition: AgentDefinition = {
	id: 'text-enhance',
	name: 'Text Enhance',
	category: 'writing',
	nodeModels: NODE_MODELS,
	streamableNodes: ['enhance_text'],
	buildGraph,

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
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

export { definition as TextEnhanceAgent };
