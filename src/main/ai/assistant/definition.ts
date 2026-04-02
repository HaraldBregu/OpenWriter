import type {
	AgentDefinition,
	AgentRuntimeContext,
	GraphInputContext,
} from '../core/definition';
import { buildGraph, ASSISTANT_NODE } from './graph';
import { ASSISTANT_STATE_MESSAGES } from './messages';
import { RagRetriever } from './nodes/rag/rag-retriever';
import { createEmbeddingModel } from '../../shared/embedding-factory';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	[ASSISTANT_NODE.UNDERSTAND]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 64,
	},
	[ASSISTANT_NODE.CONVERSATION]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.7,
		maxTokens: 2048,
	},
	[ASSISTANT_NODE.WRITING]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.8,
		maxTokens: 4096,
	},
	[ASSISTANT_NODE.EDITING]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.5,
		maxTokens: 4096,
	},
	[ASSISTANT_NODE.RESEARCH]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 4096,
	},
	[ASSISTANT_NODE.IMAGE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.7,
		maxTokens: 1024,
	},
};

const definition: AgentDefinition = {
	id: 'assistant',
	name: 'Assistant',
	category: 'utility',
	nodeModels: NODE_MODELS,
	streamableNodes: [
		ASSISTANT_NODE.CONVERSATION,
		ASSISTANT_NODE.WRITING,
		ASSISTANT_NODE.EDITING,
		ASSISTANT_NODE.RESEARCH,
		ASSISTANT_NODE.IMAGE,
	],
	buildGraph,

	prepareGraph(
		baseBuildGraph: NonNullable<AgentDefinition['buildGraph']>,
		context: AgentRuntimeContext
	): NonNullable<AgentDefinition['buildGraph']> {
		if (!context.workspacePath) return baseBuildGraph;

		const embeddings = createEmbeddingModel({
			providerId: context.providerId,
			apiKey: context.apiKey,
		});
		const retriever = new RagRetriever({ workspacePath: context.workspacePath, embeddings });

		return (models) => buildGraph(models, retriever);
	},

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			history: ctx.history,
			intent: 'conversation',
			phaseLabel: ASSISTANT_STATE_MESSAGES.UNDERSTAND,
			response: '',
		};
	},

	extractGraphOutput(state: Record<string, unknown>): string {
		return typeof state['response'] === 'string' ? state['response'] : '';
	},

	extractThinkingLabel(state: Record<string, unknown>): string | undefined {
		return typeof state['phaseLabel'] === 'string' ? state['phaseLabel'] : undefined;
	},
};

export { definition as AssistantAgent };
