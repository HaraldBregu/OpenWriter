import type { AgentDefinition, AgentRuntimeContext, GraphInputContext } from '../core/definition';
import { buildGraph, WRITER_SPECIALIST } from './graph';
import { WRITER_STATE_MESSAGES } from './messages';
import { WRITER_INTENT } from './state';

const LOG_SOURCE = 'WriterAgent';

const SPECIALIST_MODELS: AgentDefinition['nodeModels'] = {
	[WRITER_SPECIALIST.UNDERSTAND_INTENT]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[WRITER_SPECIALIST.DRAFT_RESPONSE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.6,
		maxTokens: 2048,
	},
	[WRITER_SPECIALIST.ALIGN_RESPONSE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.3,
		maxTokens: 2048,
	},
	[WRITER_SPECIALIST.REVIEW_RESPONSE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.1,
		maxTokens: 512,
	},
	[WRITER_SPECIALIST.REFINE_RESPONSE]: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 4096,
	},
};

const definition: AgentDefinition = {
	id: 'writer',
	name: 'Agent Writer',
	category: 'writing',
	nodeModels: SPECIALIST_MODELS,
	streamableNodes: [],
	buildGraph,

	prepareGraph(
		_baseBuildGraph: NonNullable<AgentDefinition['buildGraph']>,
		context: AgentRuntimeContext
	): NonNullable<AgentDefinition['buildGraph']> {
		const logger = context.logger;

		logger?.info(LOG_SOURCE, 'Preparing writer graph', {
			providerId: context.providerId,
		});

		return (models) => buildGraph(models, logger);
	},

	buildGraphInput(ctx: GraphInputContext): Record<string, unknown> {
		return {
			prompt: ctx.prompt,
			history: ctx.history,
			normalizedPrompt: '',
			intent: WRITER_INTENT.UNCLEAR,
			intentFindings: '',
			audienceGuidance: '',
			toneGuidance: '',
			lengthGuidance: '',
			draftResponse: '',
			alignedResponse: '',
			reviewFindings: '',
			needsRefinement: false,
			refinementGuidance: '',
			revisionCount: 0,
			maxRefinements: 2,
			phaseLabel: WRITER_STATE_MESSAGES.UNDERSTAND_INTENT,
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
