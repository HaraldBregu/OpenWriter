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
	[ASSISTANT_NODE.RAG_QUERY]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[ASSISTANT_NODE.GRAMMAR_CHECK]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[ASSISTANT_NODE.AGGREGATE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.6,
		maxTokens: 4096,
	},
};

const definition: AgentDefinition = {
	id: 'assistant',
	name: 'Assistant',
	category: 'utility',
	nodeModels: NODE_MODELS,
	streamableNodes: [ASSISTANT_NODE.AGGREGATE],
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
			ragFindings: '',
			grammarFindings: '',
			phaseLabel: ASSISTANT_STATE_MESSAGES.PARALLEL_CHECKS,
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
