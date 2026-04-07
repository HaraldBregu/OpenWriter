import { ChatOpenAI } from '@langchain/openai';
import type { AgentDefinition } from '../core/definition';
import type { AgentStreamEvent } from '../core/types';
import { IMAGE_GENERATOR_MESSAGES } from './messages';
import { createInitialState, applyPatch } from './state';
import { createInterpretIntentAgent, interpretIntent } from './agents/interpret-intent-agent';
import {
	createCreateImagePromptAgent,
	createImagePrompt,
} from './agents/create-image-prompt-agent';
import { generateImageStep } from './agents/generate-image-agent';
import { createCheckAlignmentAgent, checkAlignment } from './agents/check-alignment-agent';
import { deliverImage } from './agents/deliver-image-agent';

const INTERPRET_INTENT_TEMPERATURE = 0.2;
const INTERPRET_INTENT_MAX_TOKENS = 512;
const CREATE_PROMPT_TEMPERATURE = 0.4;
const CREATE_PROMPT_MAX_TOKENS = 1024;
const CHECK_ALIGNMENT_TEMPERATURE = 0.2;
const CHECK_ALIGNMENT_MAX_TOKENS = 512;

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

function buildThinkingEvent(content: string, runId: string): AgentStreamEvent {
	return { type: 'thinking', content, runId };
}

function buildDoneEvent(content: string, runId: string): AgentStreamEvent {
	return { type: 'done', content, tokenCount: 0, runId };
}

function buildErrorEvent(error: string, runId: string): AgentStreamEvent {
	return { type: 'error', error, code: 'IMAGE_GENERATOR_ERROR', runId };
}

const definition: AgentDefinition = {
	id: 'image-generator',
	name: 'Image Generator',
	category: 'utility',
	defaultModel: {
		providerId: 'openai',
		modelId: 'gpt-4o',
		temperature: 0.4,
		maxTokens: 1024,
	},
	async *execute(input) {
		if (input.provider.providerId !== 'openai') {
			yield buildErrorEvent(
				'Image Generator requires an OpenAI provider configured under the name "openai".',
				input.runId
			);
			return;
		}

		const { apiKey, baseUrl, modelName } = input.provider;

		const interpretIntentAgent = createInterpretIntentAgent(
			createNodeModel(
				apiKey,
				baseUrl,
				modelName,
				INTERPRET_INTENT_TEMPERATURE,
				INTERPRET_INTENT_MAX_TOKENS
			)
		);

		const createImagePromptAgent = createCreateImagePromptAgent(
			createNodeModel(
				apiKey,
				baseUrl,
				modelName,
				CREATE_PROMPT_TEMPERATURE,
				CREATE_PROMPT_MAX_TOKENS
			)
		);

		const checkAlignmentAgent = createCheckAlignmentAgent(
			createNodeModel(
				apiKey,
				baseUrl,
				modelName,
				CHECK_ALIGNMENT_TEMPERATURE,
				CHECK_ALIGNMENT_MAX_TOKENS
			)
		);

		let state = createInitialState(
			input.prompt,
			input.history,
			IMAGE_GENERATOR_MESSAGES.INTERPRET_INTENT
		);

		try {
			// Step 1: Interpret intent
			yield buildThinkingEvent(IMAGE_GENERATOR_MESSAGES.INTERPRET_INTENT, input.runId);
			const intentPatch = await interpretIntent(state, interpretIntentAgent);
			state = applyPatch(state, intentPatch);

			// Step 2 + 3 + 4: prompt → generate → alignment loop
			let continueLoop = true;

			while (continueLoop) {
				// Step 2: Create image prompt
				yield buildThinkingEvent(IMAGE_GENERATOR_MESSAGES.CREATE_IMAGE_PROMPT, input.runId);
				const promptPatch = await createImagePrompt(state, createImagePromptAgent);
				state = applyPatch(state, promptPatch);

				// Step 3: Generate image
				yield buildThinkingEvent(IMAGE_GENERATOR_MESSAGES.GENERATE_IMAGE, input.runId);
				const generationPatch = await generateImageStep(state, {
					apiKey,
					baseUrl,
					signal: input.signal,
					metadata: input.metadata,
					workspacePath: input.runtime.workspaceService?.getCurrent(),
					logger: input.logger,
				});
				state = applyPatch(state, generationPatch);

				// Step 4: Check alignment
				yield buildThinkingEvent(IMAGE_GENERATOR_MESSAGES.CHECK_ALIGNMENT, input.runId);
				const alignmentPatch = await checkAlignment(state, checkAlignmentAgent);
				state = applyPatch(state, alignmentPatch);

				continueLoop = !state.alignmentApproved && state.revisionCount < state.maxRevisions;
			}

			// Step 5: Deliver result
			yield buildThinkingEvent(IMAGE_GENERATOR_MESSAGES.DELIVER_IMAGE, input.runId);
			const deliveryPatch = await deliverImage(state);
			state = applyPatch(state, deliveryPatch);

			yield buildDoneEvent(state.response, input.runId);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			input.logger?.error('ImageGeneratorAgent', `Execution failed: ${message}`);
			yield buildErrorEvent(message, input.runId);
		}
	},
};

export { definition as ImageGeneratorAgent };
