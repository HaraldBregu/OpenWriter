import type { AgentDefinition, AgentRuntimeContext, GraphInputContext } from '../core/definition';
import { buildGraph, ASSISTANT_SPECIALIST } from './graph';
import { ASSISTANT_STATE_MESSAGES } from './messages';
import { RagRetriever } from './agents/rag_agent/rag-retriever';
import { createEmbeddingModel } from '../../shared/embedding-factory';

const LOG_SOURCE = 'AssistantAgent';

const SPECIALIST_MODELS: AgentDefinition['nodeModels'] = {
	[ASSISTANT_SPECIALIST.INTENT_DETECTOR]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[ASSISTANT_SPECIALIST.PLANNER]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.2,
		maxTokens: 1024,
	},
	[ASSISTANT_SPECIALIST.RAG_AGENT]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[ASSISTANT_SPECIALIST.DUCKDUCKGO_SEARCH]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[ASSISTANT_SPECIALIST.TEXT_GENERATOR]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 2048,
	},
	[ASSISTANT_SPECIALIST.ANALYZER]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[ASSISTANT_SPECIALIST.ENHANCER]: {
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
	nodeModels: SPECIALIST_MODELS,
	streamableNodes: [ASSISTANT_SPECIALIST.ENHANCER],
	buildGraph,

	prepareGraph(
		_baseBuildGraph: NonNullable<AgentDefinition['buildGraph']>,
		context: AgentRuntimeContext
	): NonNullable<AgentDefinition['buildGraph']> {
		const logger = context.logger;

		logger?.info(LOG_SOURCE, 'Preparing assistant graph', {
			hasWorkspacePath: Boolean(context.workspacePath),
			providerId: context.providerId,
		});

		if (!context.workspacePath) {
			logger?.debug(LOG_SOURCE, 'Assistant graph will run without workspace retriever');
			return (models) => buildGraph(models, undefined, logger);
		}

		const embeddings = createEmbeddingModel({
			providerId: context.providerId,
			apiKey: context.apiKey,
		});
		const retriever = new RagRetriever({ workspacePath: context.workspacePath, embeddings });

		logger?.info(LOG_SOURCE, 'Assistant graph prepared with workspace retriever', {
			workspacePath: context.workspacePath,
		});

		return (models) => buildGraph(models, retriever, logger);
	},

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			history: ctx.history,
			normalizedPrompt: '',
			intentFindings: '',
			needsRetrieval: false,
			needsWebSearch: false,
			plannerFindings: '',
			ragQuery: '',
			webSearchQuery: '',
			textFindings: '',
			ragFindings: '',
			webFindings: '',
			analysisFindings: '',
			shouldRetry: false,
			reviewCount: 0,
			phaseLabel: ASSISTANT_STATE_MESSAGES.INTENT_DETECTOR,
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
