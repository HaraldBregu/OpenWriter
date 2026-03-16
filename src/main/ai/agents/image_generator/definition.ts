/**
 * ImageGenerator — generates images from a text prompt via DALL-E 3.
 *
 * Runs as a two-node LangGraph StateGraph:
 *   START → refine-prompt → generate-image → END
 *
 * `refine-prompt` uses an LLM to turn the user's raw description into a
 * high-quality DALL-E 3 prompt. Its tokens are streamed to the caller so the
 * user can see the refinement in real-time.
 *
 * `generate-image` calls the OpenAI Images API with the refined prompt and
 * writes the result URL + revised prompt to state. It is excluded from
 * `streamableNodes` because DALL-E returns a single response, not a token
 * stream.
 *
 * Execution contract: custom-state protocol.
 *   - `buildGraphInput` maps executor context → ImageGeneratorState fields,
 *     including `apiKey` so `generate-image` can call DALL-E directly.
 *   - `extractGraphOutput` returns `state.result` — a JSON string of the form
 *     `{ imageUrl: string, revisedPrompt: string }`.
 *   - `streamMode: ['messages', 'values']` enables token streaming from
 *     `refine-prompt` while still capturing the final `values` snapshot.
 */

import type { AgentDefinition, GraphInputContext } from '../../core/definition';
import { buildGraph } from './graph';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	'refine-prompt': {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.6,
		maxTokens: 512,
	},
};

const definition: AgentDefinition = {
	id: 'image-generator',
	name: 'Image Generator',
	category: 'utility',
	nodeModels: NODE_MODELS,
	streamableNodes: ['refine-prompt'],
	buildGraph,

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			refinedPrompt: '',
			imageUrl: '',
			revisedPrompt: '',
			result: '',
			apiKey: ctx.apiKey,
			modelName: ctx.modelName,
			providerId: ctx.providerId,
		};
	},

	extractGraphOutput(state: Record<string, unknown>): string {
		return typeof state['result'] === 'string' ? state['result'] : '';
	},
};

export { definition as ImageGeneratorAgent };
