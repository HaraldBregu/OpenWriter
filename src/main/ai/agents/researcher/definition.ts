import type { AgentDefinition, GraphInputContext } from '../../core/definition';
import { buildGraph, RESEARCHER_NODE } from './graph';
import { RESEARCHER_STATE_MESSAGES } from './messages';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	[RESEARCHER_NODE.UNDERSTAND]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 1024,
	},
	[RESEARCHER_NODE.EVALUATE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.2,
		maxTokens: 1024,
	},
	[RESEARCHER_NODE.PLAN]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.2,
		maxTokens: 2048,
	},
	[RESEARCHER_NODE.RESEARCH]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.3,
		maxTokens: 4096,
	},
	[RESEARCHER_NODE.COMPOSE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.7,
		maxTokens: 4096,
	},
};

const definition: AgentDefinition = {
	id: 'researcher',
	name: 'Researcher',
	category: 'analysis',
	nodeModels: NODE_MODELS,
	streamableNodes: [RESEARCHER_NODE.COMPOSE],
	buildGraph,

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			intent: '',
			strategy: '',
			plan: [],
			research: '',
			stateMessage: RESEARCHER_STATE_MESSAGES.UNDERSTAND,
			response: '',
		};
	},

	extractGraphOutput(state: Record<string, unknown>): string {
		return typeof state['response'] === 'string' ? state['response'] : '';
	},

	extractStateMessage(state: Record<string, unknown>): string | undefined {
		return typeof state['stateMessage'] === 'string' ? state['stateMessage'] : undefined;
	},
};

export { definition as ResearcherAgent };
