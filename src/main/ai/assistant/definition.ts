import type { AgentDefinition, AgentRuntimeContext, GraphInputContext } from '../core/definition';
import { buildGraph, ASSISTANT_NODE } from './graph';
import { ASSISTANT_STATE_MESSAGES } from './messages';
import { RagRetriever } from './nodes/rag/rag-retriever';
import { createEmbeddingModel } from '../../shared/embedding-factory';

const NODE_MODELS: AgentDefinition['nodeModels'] = {
	[ASSISTANT_NODE.INTENT_CLASSIFICATION]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[ASSISTANT_NODE.TEXT_GENERATION]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 2048,
	},
	[ASSISTANT_NODE.RAG_QUERY]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[ASSISTANT_NODE.IMAGE_GENERATION]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 768,
	},
	[ASSISTANT_NODE.AGGREGATE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.5,
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
		_baseBuildGraph: NonNullable<AgentDefinition['buildGraph']>,
		context: AgentRuntimeContext
	): NonNullable<AgentDefinition['buildGraph']> {
		const logger = context.logger;

		if (!context.workspacePath) {
			return (models) => buildGraph(models, undefined, logger);
		}

		const embeddings = createEmbeddingModel({
			providerId: context.providerId,
			apiKey: context.apiKey,
		});
		const retriever = new RagRetriever({ workspacePath: context.workspacePath, embeddings });

		return (models) => buildGraph(models, retriever, logger);
	},

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			history: ctx.history,
			normalizedPrompt: '',
			intentFindings: '',
			needsRetrieval: false,
			needsImageGeneration: false,
			textFindings: '',
			ragFindings: '',
			imageFindings: '',
			phaseLabel: ASSISTANT_STATE_MESSAGES.INTENT_CLASSIFICATION,
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
