import { ChatOpenAI } from '@langchain/openai';
import type { AgentDefinition, GraphInputContext, NodeModelMap } from '../core/definition';
import { executeAIAgentsStream } from '../core/executor';
import { createPainterGraph, PAINTER_SPECIALIST, type PainterSpecialistModels } from './graph';
import { PAINTER_STATE_MESSAGES } from './messages';
import { generatePainterImage } from './image-generation';
import { type PainterAspectRatio } from './state';

function createNodeModel(
	apiKey: string,
	baseUrl: string | undefined,
	modelName: string,
	temperature: number,
	maxTokens: number
): ChatOpenAI {
	return new ChatOpenAI({
		apiKey,
		model: modelName,
		streaming: true,
		temperature,
		maxTokens,
		...(baseUrl ? { configuration: { baseURL: baseUrl } } : {}),
	});
}

function buildPainterModels(
	apiKey: string,
	baseUrl: string | undefined,
	modelName: string
): PainterSpecialistModels {
	return {
		[PAINTER_SPECIALIST.INTERPRET_INTENT]: createNodeModel(apiKey, baseUrl, modelName, 0.2, 512),
		[PAINTER_SPECIALIST.CREATE_IMAGE_PROMPT]: createNodeModel(
			apiKey,
			baseUrl,
			modelName,
			0.4,
			1024
		),
		[PAINTER_SPECIALIST.CHECK_ALIGNMENT]: createNodeModel(apiKey, baseUrl, modelName, 0.2, 512),
	};
}

function normalizeAspectRatio(value: unknown): PainterAspectRatio {
	switch (value) {
		case 'square':
		case 'portrait':
		case 'landscape':
			return value;
		default:
			return 'auto';
	}
}

function buildPainterGraphInput(ctx: GraphInputContext): Record<string, unknown> {
	return {
		prompt: ctx.prompt,
		history: ctx.history,
		visualGoal: '',
		subject: '',
		styleDirection: '',
		composition: '',
		palette: '',
		aspectRatio: 'auto',
		imagePrompt: '',
		imageAltText: '',
		alignmentFindings: '',
		refinementGuidance: '',
		alignmentApproved: false,
		generatedImagePath: '',
		generatedImageUrl: '',
		revisionCount: 0,
		maxRevisions: 2,
		phaseLabel: PAINTER_STATE_MESSAGES.INTERPRET_INTENT,
		response: '',
	};
}

function extractPainterGraphOutput(state: Record<string, unknown>): string {
	return typeof state['response'] === 'string' ? state['response'] : '';
}

function extractPainterThinkingLabel(state: Record<string, unknown>): string | undefined {
	return typeof state['phaseLabel'] === 'string' ? state['phaseLabel'] : undefined;
}

const PAINTER_STREAMABLE_NODES: string[] = [];

const definition: AgentDefinition = {
	id: 'painter',
	name: 'Painter',
	category: 'editing',
	defaultModel: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 1024,
	},
	buildGraphInput: buildPainterGraphInput,
	extractGraphOutput: extractPainterGraphOutput,
	extractThinkingLabel: extractPainterThinkingLabel,
	streamableNodes: PAINTER_STREAMABLE_NODES,
	async *execute(input) {
		if (input.provider.providerId !== 'openai') {
			throw new Error('Painter requires an OpenAI provider configured under the name "openai".');
		}

		const nodeModels = buildPainterModels(
			input.provider.apiKey,
			input.provider.baseUrl,
			input.provider.modelName
		) as unknown as NodeModelMap;

		yield* executeAIAgentsStream({
			runId: input.runId,
			provider: input.provider,
			systemPrompt: '',
			temperature: input.temperature,
			maxTokens: input.maxTokens,
			history: input.history,
			prompt: input.prompt,
			signal: input.signal,
			nodeModels,
			buildGraph: (models) =>
				createPainterGraph(
					models as unknown as PainterSpecialistModels,
					{
						generate: (state) =>
							generatePainterImage({
								prompt: state.imagePrompt,
								aspectRatio: normalizeAspectRatio(state.aspectRatio),
								apiKey: input.provider.apiKey,
								baseUrl: input.provider.baseUrl,
								signal: input.signal,
								metadata: input.metadata,
								workspacePath: input.runtime.workspaceService?.getCurrent(),
								logger: input.logger,
							}),
					},
					input.logger
				),
			buildGraphInput: buildPainterGraphInput,
			extractGraphOutput: extractPainterGraphOutput,
			extractThinkingLabel: extractPainterThinkingLabel,
			streamableNodes: PAINTER_STREAMABLE_NODES,
			metadata: input.metadata,
			logger: input.logger,
		});
	},
};

export { definition as PainterAgent };
