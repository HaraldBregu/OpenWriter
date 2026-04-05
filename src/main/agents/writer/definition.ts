import type { AgentDefinition, AgentRuntimeContext, GraphInputContext } from '../core/definition';
import { buildGraph, WRITER_SPECIALIST } from './graph';
import { WRITER_STATE_MESSAGES } from './messages';
import { createEmbeddingModel } from '../../shared/embedding-factory';
import { RagRetriever } from '../assistant/nodes/rag-retrieval';

const LOG_SOURCE = 'WriterAgent';

const SPECIALIST_MODELS: AgentDefinition['nodeModels'] = {
	[WRITER_SPECIALIST.ROUTER]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[WRITER_SPECIALIST.RAG_RETRIEVAL]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[WRITER_SPECIALIST.SEARCH]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[WRITER_SPECIALIST.AGGREGATOR]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.5,
		maxTokens: 4096,
	},
};

const definition: AgentDefinition = {
	id: 'writer',
	name: 'Agent Writer',
	category: 'writing',
	nodeModels: SPECIALIST_MODELS,
	streamableNodes: [WRITER_SPECIALIST.AGGREGATOR],
	buildGraph,

	prepareGraph(
		_baseBuildGraph: NonNullable<AgentDefinition['buildGraph']>,
		context: AgentRuntimeContext
	): NonNullable<AgentDefinition['buildGraph']> {
		const logger = context.logger;

		logger?.info(LOG_SOURCE, 'Preparing writer graph', {
			hasWorkspace: Boolean(context.workspaceService?.getCurrent()),
			providerId: context.providerId,
		});

		if (!context.workspaceService?.getCurrent()) {
			logger?.debug(LOG_SOURCE, 'Writer graph will run without workspace retriever');
			return (models) => buildGraph(models, undefined, logger);
		}

		const embeddings = createEmbeddingModel({
			providerId: context.providerId,
			apiKey: context.apiKey,
		});
		const retriever = new RagRetriever({ workspaceService: context.workspaceService, embeddings });

		logger?.info(LOG_SOURCE, 'Writer graph prepared with workspace retriever', {
			workspacePath: context.workspaceService.getCurrent(),
		});

		return (models) => buildGraph(models, retriever, logger);
	},

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			history: ctx.history,
			normalizedPrompt: '',
			routingFindings: '',
			simpleResponse: true,
			needsRetrieval: false,
			needsWebSearch: false,
			ragQuery: '',
			webSearchQuery: '',
			ragFindings: '',
			webFindings: '',
			phaseLabel: WRITER_STATE_MESSAGES.ROUTER,
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

export { definition as WriterAgent };
