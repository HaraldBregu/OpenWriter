import type { AgentDefinition, AgentRuntimeContext, GraphInputContext } from '../core/definition';
import { buildGraph, ASSISTANT_SPECIALIST } from './graph';
import { ASSISTANT_STATE_MESSAGES } from './messages';
import { createEmbeddingModel } from '../../shared/embedding-factory';
import { RagRetriever } from './nodes/retrieve-documents';

const LOG_SOURCE = 'AssistantAgent';

const SPECIALIST_MODELS: AgentDefinition['nodeModels'] = {
	[ASSISTANT_SPECIALIST.ROUTE_QUESTION]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[ASSISTANT_SPECIALIST.GENERATE_DIRECT_ANSWER]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 4096,
	},
	[ASSISTANT_SPECIALIST.RETRIEVE_DOCUMENTS]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 768,
	},
	[ASSISTANT_SPECIALIST.GRADE_DOCUMENTS]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 256,
	},
	[ASSISTANT_SPECIALIST.REWRITE_QUERY]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 256,
	},
	[ASSISTANT_SPECIALIST.RETURN_FALLBACK_RESPONSE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.3,
		maxTokens: 512,
	},
	[ASSISTANT_SPECIALIST.GENERATE_ANSWER]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 4096,
	},
};

const definition: AgentDefinition = {
	id: 'assistant',
	name: 'Assistant',
	category: 'utility',
	nodeModels: SPECIALIST_MODELS,
	streamableNodes: [
		ASSISTANT_SPECIALIST.GENERATE_DIRECT_ANSWER,
		ASSISTANT_SPECIALIST.RETURN_FALLBACK_RESPONSE,
		ASSISTANT_SPECIALIST.GENERATE_ANSWER,
	],
	buildGraph,

	prepareGraph(
		_baseBuildGraph: NonNullable<AgentDefinition['buildGraph']>,
		context: AgentRuntimeContext
	): NonNullable<AgentDefinition['buildGraph']> {
		const logger = context.logger;

		logger?.info(LOG_SOURCE, 'Preparing assistant graph', {
			hasWorkspace: Boolean(context.workspaceService?.getCurrent()),
			providerId: context.providerId,
		});

		if (!context.workspaceService?.getCurrent()) {
			logger?.debug(LOG_SOURCE, 'Assistant graph will run without workspace retriever');
			return (models) => buildGraph(models, undefined, logger);
		}

		const embeddings = createEmbeddingModel({
			providerId: context.providerId,
			apiKey: context.apiKey,
		});
		const retriever = new RagRetriever({ workspaceService: context.workspaceService, embeddings });

		logger?.info(LOG_SOURCE, 'Assistant graph prepared with workspace retriever', {
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
			routeDecision: 'direct',
			retrievalQuery: '',
			retrievedContext: '',
			retrievalStatus: 'idle',
			documentsRelevant: false,
			gradeFindings: '',
			retryCount: 0,
			maxRetries: 2,
			phaseLabel: ASSISTANT_STATE_MESSAGES.ROUTE_QUESTION,
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
